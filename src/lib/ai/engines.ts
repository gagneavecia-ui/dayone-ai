import 'server-only';
import { z } from 'zod';
import { aiChat, AiConfigurationError, AiProviderError, extractJson } from './providers';
import type { Language, MissionPriority } from '@/types';

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
};

export class EngineError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'EngineError';
  }
}

/* ---------------------------------- Mission Engine ---------------------------------- */

export interface MissionDraft {
  title: string;
  instructions: string;
  durationMin: number;
  goalId: string | null;
  priority: MissionPriority;
}

const MissionDraftSchema = z.object({
  title: z.string().min(3).max(120),
  instructions: z.string().min(10).max(600),
  durationMin: z.number().int().min(5).max(180),
  goalId: z.string().nullable(),
  priority: z.enum(['high', 'medium', 'low']),
});

export interface MissionEngineContext {
  displayName: string;
  language: Language;
  timezone: string;
  availabilityMinutes: number;
  organization: 'morning' | 'evening' | 'flexible';
  date: string;
  goals: { id: string; title: string; description: string; progress: number; deadline: number | null }[];
  recentMissions: { title: string; date: string; status: string }[];
}

const MISSION_RESPONSE = z.object({
  missions: z.array(MissionDraftSchema),
});

export async function generateDailyMissions(ctx: MissionEngineContext): Promise<MissionDraft[]> {
  if (ctx.goals.length === 0) {
    throw new EngineError('NO_GOALS', 'At least one active goal is required to generate missions.');
  }
  const goalLines = ctx.goals
    .map((g) => `- id=${g.id} | "${g.title}" | progress ${g.progress}%${g.deadline ? ` | deadline ${new Date(g.deadline).toISOString().slice(0, 10)}` : ''}`)
    .join('\n');
  const recent = ctx.recentMissions
    .slice(0, 9)
    .map((m) => `- [${m.date}] (${m.status}) ${m.title}`)
    .join('\n');

  const system = `You are the Mission Engine of DAYONE AI, a productivity companion for young people (16+).
You turn goals into THREE concrete daily missions. Rules:
- Output ONLY JSON: {"missions":[{"title":string,"instructions":string,"durationMin":number,"goalId":string|null,"priority":"high"|"medium"|"low"}]}
- Exactly 3 missions. Total durationMin should fit within the user's daily availability (small overflow allowed).
- Each mission is a single concrete action doable in one sitting (5-90 minutes).
- instructions: 2-3 short sentences, imperative voice, specific and actionable. No generic fluff like "work on it".
- Spread missions across different goals when several goals exist. goalId MUST be one of the provided ids or null.
- Never repeat missions from the recent list; build on them instead.
- Write title and instructions in ${LANGUAGE_NAMES[ctx.language]}.
- First mission should match the user's preferred moment of day (${ctx.organization}).
- You are a productivity tool: never give medical, psychological or financial advice.`;

  const user = `User: ${ctx.displayName}
Today (user timezone ${ctx.timezone}): ${ctx.date}
Daily availability: ${ctx.availabilityMinutes} minutes
Active goals:
${goalLines}
Recent missions (avoid repeating):
${recent || '(none)'}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { text } = await aiChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { json: true, temperature: 0.8, maxTokens: 1000 },
    );
    const raw = extractJson<unknown>(text);
    const parsed = MISSION_RESPONSE.safeParse(raw);
    if (parsed.success && parsed.data.missions.length > 0) {
      return parsed.data.missions.slice(0, 3);
    }
    // A bare array is also accepted.
    if (Array.isArray(raw)) {
      const bare = z.array(MissionDraftSchema).safeParse(raw);
      if (bare.success && bare.data.length > 0) return bare.data.slice(0, 3);
    }
  }
  throw new AiProviderError('The mission engine could not produce valid missions.');
}

/* ---------------------------------- Coach Engine ---------------------------------- */

export interface CoachContext {
  displayName: string;
  language: Language;
  goals: { title: string; description: string; progress: number }[];
  missionsToday: { title: string; status: string; priority: string }[];
  lastReview: { difficult: string; improve: string } | null;
}

const COACH_HISTORY = z.array(
  z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(8000),
  }),
);

export async function coachReply(ctx: CoachContext, history: unknown): Promise<string> {
  const parsedHistory = COACH_HISTORY.safeParse(history);
  const messages = parsedHistory.success ? parsedHistory.data.slice(-16) : [];

  const goalLines = ctx.goals.map((g) => `- "${g.title}" (${g.progress}% done)`).join('\n') || '(none yet)';
  const missionLines = ctx.missionsToday
    .map((m) => `- [${m.status}/${m.priority}] ${m.title}`)
    .join('\n') || '(none generated yet)';

  const system = `You are the DAYONE AI Coach for ${ctx.displayName}, a friendly productivity coach for young people (16+).
Hard limits: you are NOT a doctor, therapist, psychologist or financial advisor. If the user asks for medical, mental-health, legal or financial advice, kindly clarify that you are a productivity coach and suggest consulting a qualified professional.
Style: warm, direct, pragmatic. Keep answers under 180 words unless the user explicitly asks for more. Always end with one concrete next step tied to their goals or missions.
Ground your advice in the user's real context below. Answer in ${LANGUAGE_NAMES[ctx.language]}.
User goals:
${goalLines}
Today's missions:
${missionLines}
${ctx.lastReview ? `Yesterday's review — difficult: "${ctx.lastReview.difficult}", wants to improve: "${ctx.lastReview.improve}".` : ''}`;

  const { text } = await aiChat(
    [{ role: 'system', content: system }, ...messages],
    { temperature: 0.8, maxTokens: 800 },
  );
  return text.trim();
}

/* ---------------------------------- Review Engine ---------------------------------- */

export interface ReviewEngineContext {
  displayName: string;
  language: Language;
  date: string;
  accomplished: string;
  difficult: string;
  improve: string;
  comment: string;
  missionsDone: string[];
  missionsPlanned: number;
  goals: { title: string; progress: number }[];
}

const ReviewInsightsSchema = z.object({
  summary: z.string().min(1).max(600),
  adjustments: z.array(z.string().min(3).max(300)).min(1).max(4),
  focus: z.string().min(3).max(200),
});

export type ReviewInsights = z.infer<typeof ReviewInsightsSchema>;

export async function reviewInsights(ctx: ReviewEngineContext): Promise<ReviewInsights> {
  const system = `You are the Review Engine of DAYONE AI, a productivity companion for young people (16+).
Given the user's daily review, produce JSON: {"summary":string,"adjustments":[string],"focus":string}.
- summary: 2 sentences, encouraging but honest, written to the user ("you").
- adjustments: 1 to 4 concrete, realistic changes for tomorrow based on what was hard (size each to their availability).
- focus: the single most important focus for tomorrow, one sentence.
- Tone: supportive, zero guilt. Write in ${LANGUAGE_NAMES[ctx.language]}.
- You are a productivity tool: never give medical, psychological or financial advice.`;

  const user = `User: ${ctx.displayName}
Date: ${ctx.date}
Missions done: ${ctx.missionsDone.length}/${ctx.missionsPlanned}
Completed: ${ctx.missionsDone.join('; ') || '(none)'}
Accomplished: ${ctx.accomplished || '(not filled)'}
Difficult: ${ctx.difficult || '(not filled)'}
Wants to improve: ${ctx.improve || '(not filled)'}
Extra comment: ${ctx.comment || '(none)'}
Goals: ${ctx.goals.map((g) => `"${g.title}" ${g.progress}%`).join('; ') || '(none)'}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { text } = await aiChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { json: true, temperature: 0.7, maxTokens: 700 },
    );
    const parsed = ReviewInsightsSchema.safeParse(extractJson<unknown>(text));
    if (parsed.success) return parsed.data;
  }
  throw new AiProviderError('The review engine could not produce valid insights.');
}

export { AiConfigurationError, AiProviderError };
