import { z } from 'zod';
import { getAuthContext, jsonError } from '@/lib/auth/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  bumpGlobalAiUsage,
  consumeQuota,
  getServerProfile,
  refundQuota,
} from '@/lib/ai/quotas';
import { localDateFor } from '@/lib/date';
import { reviewInsights, AiConfigurationError, AiProviderError } from '@/lib/ai/engines';
import type { Goal, Mission } from '@/types';

const BodySchema = z.object({
  accomplished: z.string().trim().min(1).max(2000),
  difficult: z.string().trim().max(2000).default(''),
  improve: z.string().trim().max(2000).default(''),
  comment: z.string().trim().max(2000).default(''),
});

export async function POST(req: Request) {
  if (!rateLimit(`review:${clientIp(req)}`, 6, 60_000)) {
    return jsonError(429, 'rate_limited', 'Too many requests, slow down.');
  }
  const auth = await getAuthContext(req);
  if (!auth.ok) return jsonError(auth.status, auth.code, auth.message);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return jsonError(400, 'invalid_body', 'accomplished is required.');
  }

  const { uid } = auth.ctx;
  const profile = await getServerProfile(uid);
  if (!profile) return jsonError(404, 'profile_not_found', 'Complete onboarding first.');
  const date = localDateFor(profile.timezone);
  const plan = profile.plan === 'premium' ? 'premium' : 'free';

  const quota = await consumeQuota(uid, 'aiCall', profile.timezone, plan);
  if (!quota.allowed) {
    return jsonError(429, 'quota_reached', JSON.stringify(quota));
  }

  try {
    const db = getAdminDb();
    if (!db) return jsonError(503, 'firebase_not_configured');

    // One review per day: the deterministic doc id prevents duplicates.
    const reviewRef = db.collection('dailyReviews').doc(`${uid}_${date}`);
    const existing = await reviewRef.get();
    if (existing.exists && (existing.data() as { aiSummary?: string | null }).aiSummary) {
      await refundQuota(uid, 'aiCall', profile.timezone);
      return jsonError(409, 'review_exists', 'A review for today already exists.');
    }

    // Single-field queries + in-memory filtering (no composite indexes needed).
    const missionsSnap = await db.collection('missions').where('ownerId', '==', uid).get();
    const missions = missionsSnap.docs.map((d) => d.data() as Mission).filter((m) => m.date === date);

    const goalsSnap = await db.collection('goals').where('ownerId', '==', uid).get();
    const goals = goalsSnap.docs.map((d) => d.data() as Goal).filter((g) => g.status === 'active');

    const insights = await reviewInsights({
      displayName: profile.displayName || auth.ctx.email,
      language: profile.language,
      date,
      accomplished: body.accomplished,
      difficult: body.difficult,
      improve: body.improve,
      comment: body.comment,
      missionsDone: missions.filter((m) => m.status === 'done').map((m) => m.title),
      missionsPlanned: missions.length,
      goals: goals.map((g) => ({ title: g.title, progress: g.progress })),
    });

    await reviewRef.set(
      {
        ownerId: uid,
        date,
        accomplished: body.accomplished,
        difficult: body.difficult,
        improve: body.improve,
        comment: body.comment,
        aiSummary: insights.summary,
        aiAdjustments: insights.adjustments,
        aiFocus: insights.focus,
        createdAt: Date.now(),
      },
      { merge: true },
    );
    await bumpGlobalAiUsage('aiCall');

    return Response.json({ insights, date });
  } catch (error) {
    await refundQuota(uid, 'aiCall', profile.timezone);
    if (error instanceof AiConfigurationError) {
      return jsonError(503, 'ai_not_configured', error.message);
    }
    if (error instanceof AiProviderError) {
      return jsonError(502, 'ai_unavailable', 'The AI provider could not complete the request.');
    }
    return jsonError(500, 'internal_error');
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
