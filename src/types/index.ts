export type Language = 'en' | 'fr' | 'es';

export type Plan = 'free' | 'premium';
export type Role = 'user' | 'admin' | 'super_admin';

export type MissionStatus = 'todo' | 'in_progress' | 'done' | 'postponed';
export type MissionPriority = 'high' | 'medium' | 'low';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  language: Language;
  timezone: string;
  availabilityMinutes: number;
  organization: 'morning' | 'evening' | 'flexible';
  plan: Plan;
  onboardingComplete: boolean;
  createdAt: number;
}

export interface GoalStep {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  deadline: number | null;
  steps: GoalStep[];
  progress: number;
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface Mission {
  id: string;
  ownerId: string;
  goalId: string | null;
  goalTitle: string | null;
  title: string;
  instructions: string;
  durationMin: number;
  priority: MissionPriority;
  date: string; // YYYY-MM-DD in the user's timezone
  status: MissionStatus;
  aiGenerated: boolean;
  createdAt: number;
  completedAt: number | null;
}

export interface DailyPlan {
  id: string;
  ownerId: string;
  date: string;
  missionIds: string[];
  generatedAt: number;
}

export interface Conversation {
  id: string;
  ownerId: string;
  title: string;
  engine: 'coach';
  language: Language;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessageDoc {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface DailyReview {
  id: string;
  ownerId: string;
  date: string;
  accomplished: string;
  difficult: string;
  improve: string;
  comment: string;
  aiSummary: string | null;
  aiAdjustments: string[] | null;
  aiFocus: string | null;
  createdAt: number;
}

export interface UsageDay {
  date: string;
  coachMessages: number;
  aiCalls: number;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  target: string;
  meta: string;
  createdAt: number;
}

export interface FeedbackDoc {
  id: string;
  ownerId: string;
  category: 'bug' | 'idea' | 'other';
  message: string;
  createdAt: number;
}

export interface SystemQuotas {
  coachFree: number;
  coachPremium: number;
  missionsFree: number;
  missionsPremium: number;
  goalsFree: number;
  goalsPremium: number;
  historyFree: number;
  historyPremium: number;
}

export interface SystemConfig {
  quotas: SystemQuotas;
  updatedAt: number;
  updatedBy: string;
}
