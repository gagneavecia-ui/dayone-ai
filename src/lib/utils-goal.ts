import type { GoalStep } from '@/types';

export function computeProgress(steps: GoalStep[]): number {
  if (!steps || steps.length === 0) return 0;
  const done = steps.filter((s) => s.done).length;
  return Math.round((done / steps.length) * 100);
}

export function newStep(title: string): GoalStep {
  return { id: crypto.randomUUID(), title, done: false };
}
