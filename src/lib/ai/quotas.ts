import { getAdminDb } from '@/lib/firebase/admin';
import { resolveLimits, DEFAULT_QUOTAS, PLAN_LIMITS, type PlanName } from '@/lib/plans';
import { localDateFor } from '@/lib/date';
import type { SystemConfig, UsageDay, UserProfile } from '@/types';
import { z } from 'zod';

const QuotasSchema = z.object({
  coachFree: z.number().int().min(0).max(1000),
  coachPremium: z.number().int().min(0).max(1000),
  missionsFree: z.number().int().min(0).max(1000),
  missionsPremium: z.number().int().min(0).max(1000),
  goalsFree: z.number().int().min(1).max(100),
  goalsPremium: z.number().int().min(1).max(100),
  historyFree: z.number().int().min(1).max(365),
  historyPremium: z.number().int().min(1).max(365),
});

export const SystemConfigSchema = z.object({ quotas: QuotasSchema });

export async function getSystemConfig(): Promise<SystemConfig> {
  const db = getAdminDb();
  if (!db) return { quotas: { ...DEFAULT_QUOTAS }, updatedAt: 0, updatedBy: '' };
  try {
    const snap = await db.collection('systemConfig').doc('quotas').get();
    if (!snap.exists) return { quotas: { ...DEFAULT_QUOTAS }, updatedAt: 0, updatedBy: '' };
    const parsed = SystemConfigSchema.safeParse(snap.data());
    if (parsed.success) return { ...parsed.data, updatedAt: 0, updatedBy: '' };
    return { quotas: { ...DEFAULT_QUOTAS }, updatedAt: 0, updatedBy: '' };
  } catch {
    return { quotas: { ...DEFAULT_QUOTAS }, updatedAt: 0, updatedBy: '' };
  }
}

/** Reads the user's profile server-side (never trust the browser). */
export async function getServerProfile(uid: string): Promise<UserProfile | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return null;
    return snap.data() as UserProfile;
  } catch {
    return null;
  }
}

function limitsFor(plan: PlanName, config: SystemConfig) {
  return {
    coach: plan === 'premium' ? config.quotas.coachPremium : config.quotas.coachFree,
    aiCalls: plan === 'premium' ? config.quotas.missionsPremium : config.quotas.missionsFree,
  };
}

export type QuotaKind = 'coach' | 'aiCall';

export interface QuotaState {
  allowed: boolean;
  used: number;
  limit: number;
}

/**
 * Atomically checks and consumes a daily quota for the user, stored under
 * users/{uid}/usage/{YYYY-MM-DD} in the user's local timezone.
 */
export async function consumeQuota(
  uid: string,
  kind: QuotaKind,
  timezone: string,
  plan: PlanName,
): Promise<QuotaState> {
  const db = getAdminDb();
  const config = await getSystemConfig();
  const limits = limitsFor(plan, config);
  const limit = kind === 'coach' ? limits.coach : limits.aiCalls;
  const date = localDateFor(timezone);
  if (!db) return { allowed: false, used: 0, limit }; // fail closed without a backend
  const ref = db.collection('users').doc(uid).collection('usage').doc(date);
  const field = kind === 'coach' ? 'coachMessages' : 'aiCalls';
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = (snap.data() as UsageDay | undefined) ?? { date, coachMessages: 0, aiCalls: 0 };
      const used = field === 'coachMessages' ? current.coachMessages : current.aiCalls;
      if (used >= limit) {
        tx.set(ref, current, { merge: true });
        return;
      }
      const updated: UsageDay = { ...current, [field]: used + 1 };
      tx.set(ref, updated, { merge: true });
    });
  } catch {
    return { allowed: false, used: 0, limit };
  }
  const snap = await ref.get();
  const data = (snap.data() as UsageDay | undefined) ?? { date, coachMessages: 0, aiCalls: 0 };
  const used = field === 'coachMessages' ? data.coachMessages : data.aiCalls;
  return { allowed: used <= limit, used, limit };
}

export async function peekQuota(
  uid: string,
  kind: QuotaKind,
  timezone: string,
  plan: PlanName,
): Promise<QuotaState> {
  const db = getAdminDb();
  const config = await getSystemConfig();
  const limits = limitsFor(plan, config);
  const limit = kind === 'coach' ? limits.coach : limits.aiCalls;
  const date = localDateFor(timezone);
  if (!db) return { allowed: false, used: 0, limit };
  try {
    const snap = await db.collection('users').doc(uid).collection('usage').doc(date).get();
    const data = (snap.data() as UsageDay | undefined) ?? { date, coachMessages: 0, aiCalls: 0 };
    const used = kind === 'coach' ? data.coachMessages : data.aiCalls;
    return { allowed: used < limit, used, limit };
  } catch {
    return { allowed: false, used: 0, limit };
  }
}

/** Returns a consumed unit when the AI provider failed (no double penalty). */
export async function refundQuota(
  uid: string,
  kind: QuotaKind,
  timezone: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const date = localDateFor(timezone);
  const ref = db.collection('users').doc(uid).collection('usage').doc(date);
  const field = kind === 'coach' ? 'coachMessages' : 'aiCalls';
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = (snap.data() as UsageDay | undefined) ?? { date, coachMessages: 0, aiCalls: 0 };
      const updated = { ...current, [field]: Math.max(0, current[field] - 1) };
      tx.set(ref, updated, { merge: true });
    });
  } catch {
    /* best-effort */
  }
}

export async function bumpGlobalAiUsage(kind: QuotaKind): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const date = localDateFor('UTC');
  const ref = db.collection('globalMetrics').doc('aiUsage');
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const days = ((snap.data()?.days as Record<string, { coach: number; missions: number }> | undefined) ?? {});
      const day = days[date] ?? { coach: 0, missions: 0 };
      if (kind === 'coach') day.coach += 1;
      else day.missions += 1;
      days[date] = day;
      // Keep the last 90 days only.
      const keys = Object.keys(days).sort();
      while (keys.length > 90) delete days[keys.shift() as string];
      tx.set(ref, { days, updatedAt: Date.now() }, { merge: true });
    });
  } catch {
    /* metrics are best-effort */
  }
}

export { resolveLimits, PLAN_LIMITS };
