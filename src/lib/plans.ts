import type { SystemConfig, SystemQuotas } from '@/types';

/**
 * Default plan limits. All values can be overridden server-side through the
 * `systemConfig/quotas` Firestore document (editable by admins). The server
 * NEVER trusts a plan value coming from the browser: it reads the user's
 * profile and this configuration with the Firebase Admin SDK.
 */
export const PLAN_LIMITS = {
  free: {
    activeGoals: 3,
    missionsPerDay: 3,
    coachMessagesPerDay: 5,
    aiCallsPerDay: 8,
    historyDays: 7,
  },
  premium: {
    activeGoals: 10,
    missionsPerDay: 3,
    coachMessagesPerDay: 30,
    aiCallsPerDay: 40,
    historyDays: 90,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export const DEFAULT_QUOTAS: SystemQuotas = {
  coachFree: PLAN_LIMITS.free.coachMessagesPerDay,
  coachPremium: PLAN_LIMITS.premium.coachMessagesPerDay,
  missionsFree: PLAN_LIMITS.free.aiCallsPerDay,
  missionsPremium: PLAN_LIMITS.premium.aiCallsPerDay,
  goalsFree: PLAN_LIMITS.free.activeGoals,
  goalsPremium: PLAN_LIMITS.premium.activeGoals,
  historyFree: PLAN_LIMITS.free.historyDays,
  historyPremium: PLAN_LIMITS.premium.historyDays,
};

/** Resolve effective limits for a plan, applying server-side overrides. */
export function resolveLimits(plan: PlanName, config: SystemConfig | null) {
  const base = PLAN_LIMITS[plan];
  if (!config) return { ...base };
  const q = config.quotas;
  return {
    activeGoals: plan === 'free' ? q.goalsFree : q.goalsPremium,
    missionsPerDay: base.missionsPerDay,
    coachMessagesPerDay: plan === 'free' ? q.coachFree : q.coachPremium,
    aiCallsPerDay: plan === 'free' ? q.missionsFree : q.missionsPremium,
    historyDays: plan === 'free' ? q.historyFree : q.historyPremium,
  };
}
