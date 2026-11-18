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
import { coachReply, AiConfigurationError, AiProviderError } from '@/lib/ai/engines';
import type { Conversation, DailyReview, Goal, Mission } from '@/types';

const BodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().trim().min(1).max(200),
});

export async function POST(req: Request) {
  if (!rateLimit(`coach:${clientIp(req)}`, 10, 60_000)) {
    return jsonError(429, 'rate_limited', 'Too many requests, slow down.');
  }
  const auth = await getAuthContext(req);
  if (!auth.ok) return jsonError(auth.status, auth.code, auth.message);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return jsonError(400, 'invalid_body', 'message and conversationId are required.');
  }

  const { uid } = auth.ctx;
  const profile = await getServerProfile(uid);
  if (!profile) return jsonError(404, 'profile_not_found', 'Complete onboarding first.');
  const date = localDateFor(profile.timezone);

  const plan = profile.plan === 'premium' ? 'premium' : 'free';
  const quota = await consumeQuota(uid, 'coach', profile.timezone, plan);
  if (!quota.allowed) {
    return jsonError(429, 'quota_reached', JSON.stringify(quota));
  }

  try {
    const db = getAdminDb();
    if (!db) return jsonError(503, 'firebase_not_configured');

    // Conversation ownership is verified server-side.
    const convRef = db.collection('conversations').doc(body.conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists || (convSnap.data() as Conversation).ownerId !== uid) {
      return jsonError(403, 'forbidden_conversation');
    }

    // Context: goals, today's missions, last review.
    // Single-field queries + in-memory filtering (no composite indexes needed).
    const goalsSnap = await db.collection('goals').where('ownerId', '==', uid).get();
    const goals = goalsSnap.docs.map((d) => (d.data() as Goal)).filter((g) => g.status === 'active');

    const missionsSnap = await db.collection('missions').where('ownerId', '==', uid).get();
    const missions = missionsSnap.docs.map((d) => d.data() as Mission).filter((m) => m.date === date);

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const reviewSnap = await db.collection('dailyReviews').doc(`${uid}_${yesterday}`).get();
    const lastReview = reviewSnap.exists ? (reviewSnap.data() as DailyReview) : null;

    // Recent conversation history (excluding the message being added).
    const historySnap = await convRef
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(16)
      .get();
    const history = historySnap.docs
      .reverse()
      .map((d) => d.data() as { role: 'user' | 'assistant'; content: string });

    await convRef.collection('messages').add({
      role: 'user',
      content: body.message,
      createdAt: Date.now(),
    });

    const reply = await coachReply(
      {
        displayName: profile.displayName || auth.ctx.email,
        language: profile.language,
        goals: goals.map((g) => ({ title: g.title, description: g.description, progress: g.progress })),
        missionsToday: missions.map((m) => ({ title: m.title, status: m.status, priority: m.priority })),
        lastReview: lastReview ? { difficult: lastReview.difficult, improve: lastReview.improve } : null,
      },
      [...history, { role: 'user' as const, content: body.message }],
    );

    await convRef.collection('messages').add({
      role: 'assistant',
      content: reply,
      createdAt: Date.now(),
    });
    await convRef.update({ updatedAt: Date.now() });
    await bumpGlobalAiUsage('coach');

    return Response.json({ reply, conversationId: body.conversationId, used: quota.used, limit: quota.limit });
  } catch (error) {
    await refundQuota(uid, 'coach', profile.timezone);
    if (error instanceof AiConfigurationError) {
      return jsonError(503, 'ai_not_configured', error.message);
    }
    if (error instanceof AiProviderError) {
      return jsonError(502, 'ai_unavailable', 'The AI provider could not complete the request.');
    }
    return jsonError(500, 'internal_error');
  }
}

// Node runtime is required for the Firebase Admin SDK.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
