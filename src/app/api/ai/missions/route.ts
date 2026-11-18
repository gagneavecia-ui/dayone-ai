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
import { generateDailyMissions, AiConfigurationError, AiProviderError } from '@/lib/ai/engines';
import type { Goal, Mission } from '@/types';

export async function POST(req: Request) {
  if (!rateLimit(`missions:${clientIp(req)}`, 6, 60_000)) {
    return jsonError(429, 'rate_limited', 'Too many requests, slow down.');
  }
  const auth = await getAuthContext(req);
  if (!auth.ok) return jsonError(auth.status, auth.code, auth.message);

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

    const goalsSnap = await db
      .collection('goals')
      .where('ownerId', '==', uid)
      .where('status', '==', 'active')
      .get();
    const goals = goalsSnap.docs
      .map((d) => ({ ...(d.data() as Goal), id: d.id }))
      .sort((a, b) => a.progress - b.progress);

    if (goals.length === 0) {
      await refundQuota(uid, 'aiCall', profile.timezone);
      return jsonError(400, 'no_goals', 'Create an active goal before generating missions.');
    }

    // Recent missions to avoid repetition.
    const since = new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10);
    const recentSnap = await db
      .collection('missions')
      .where('ownerId', '==', uid)
      .where('date', '>=', since)
      .get();
    const recentMissions = recentSnap.docs
      .map((d) => d.data() as Mission)
      .filter((m) => m.date !== date)
      .map((m) => ({ title: m.title, date: m.date, status: m.status }));

    const drafts = await generateDailyMissions({
      displayName: profile.displayName || auth.ctx.email,
      language: profile.language,
      timezone: profile.timezone,
      availabilityMinutes: profile.availabilityMinutes || 30,
      organization: profile.organization || 'flexible',
      date,
      goals: goals.map((g) => ({
        id: g.id,
        title: g.title,
        description: (g.description || '').slice(0, 300),
        progress: g.progress,
        deadline: g.deadline ?? null,
      })),
      recentMissions,
    });

    // Replace today's pending missions; completed ones are preserved.
    const todaySnap = await db
      .collection('missions')
      .where('ownerId', '==', uid)
      .where('date', '==', date)
      .get();
    const toDelete = todaySnap.docs.filter((d) => {
      const m = d.data() as Mission;
      return m.status !== 'done';
    });
    for (const d of toDelete) {
      await d.ref.delete();
    }

    const goalById = new Map(goals.map((g) => [g.id, g]));
    const missionIds: string[] = [];
    for (const draft of drafts) {
      const goal = draft.goalId ? goalById.get(draft.goalId) : undefined;
      const ref = await db.collection('missions').add({
        ownerId: uid,
        goalId: goal ? goal.id : null,
        goalTitle: goal ? goal.title : null,
        title: draft.title,
        instructions: draft.instructions,
        durationMin: draft.durationMin,
        priority: draft.priority,
        date,
        status: 'todo',
        aiGenerated: true,
        createdAt: Date.now(),
        completedAt: null,
      });
      missionIds.push(ref.id);
    }

    await db.collection('dailyPlans').doc(`${uid}_${date}`).set(
      { ownerId: uid, date, missionIds, generatedAt: Date.now() },
      { merge: true },
    );
    await bumpGlobalAiUsage('aiCall');

    const remaining = Math.max(0, quota.limit - quota.used - 1);
    return Response.json({ missionIds, date, remaining, limit: quota.limit });
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
