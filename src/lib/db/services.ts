import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase/client';
import { computeProgress } from '@/lib/utils-goal';
import type {
  Conversation,
  DailyPlan,
  DailyReview,
  FeedbackDoc,
  Goal,
  GoalStep,
  Mission,
  MissionStatus,
  UsageDay,
  UserProfile,
} from '@/types';

/* ------------------------------- Profile ------------------------------- */

export function userDocRef(uid: string) {
  const db = getFirestoreDb();
  if (!db) throw new Error('FIREBASE_NOT_CONFIGURED');
  return doc(db, 'users', uid);
}

export async function saveUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await setDoc(userDocRef(uid), data, { merge: true });
}

/* -------------------------------- Goals -------------------------------- */

/**
 * Single-field query by design: composite indexes are not required for this
 * app to work (a user has a handful of goals, so filtering/sorting in memory
 * is both cheaper and more resilient than depending on manual index setup).
 */
export function subscribeGoals(uid: string, status: 'active' | 'archived', cb: (goals: Goal[]) => void): Unsubscribe {
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'goals'), where('ownerId', '==', uid));
  return onSnapshot(q, (snap) => {
    const goals = snap.docs
      .map((d) => ({ ...(d.data() as Goal), id: d.id }))
      .filter((g) => g.status === status)
      .sort((a, b) => b.createdAt - a.createdAt);
    cb(goals);
  });
}

export interface GoalInput {
  title: string;
  description: string;
  deadline: number | null;
  steps: GoalStep[];
}

export async function createGoal(uid: string, input: GoalInput): Promise<string> {
  const db = getFirestoreDb()!;
  const now = Date.now();
  const ref = await addDoc(collection(db, 'goals'), {
    ownerId: uid,
    ...input,
    progress: computeProgress(input.steps),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateGoal(goalId: string, input: GoalInput): Promise<void> {
  const db = getFirestoreDb()!;
  await updateDoc(doc(db, 'goals', goalId), {
    ...input,
    progress: computeProgress(input.steps),
    updatedAt: Date.now(),
  });
}

export async function setGoalStatus(goalId: string, status: 'active' | 'archived'): Promise<void> {
  const db = getFirestoreDb()!;
  await updateDoc(doc(db, 'goals', goalId), { status, updatedAt: Date.now() });
}

export async function toggleGoalStep(goalId: string, goal: Goal, stepId: string): Promise<void> {
  const db = getFirestoreDb()!;
  const steps = goal.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
  await updateDoc(doc(db, 'goals', goalId), { steps, progress: computeProgress(steps), updatedAt: Date.now() });
}

export async function deleteGoal(goalId: string): Promise<void> {
  const db = getFirestoreDb()!;
  await deleteDoc(doc(db, 'goals', goalId));
}

export async function countActiveGoals(uid: string): Promise<number> {
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'goals'), where('ownerId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.filter((d) => (d.data() as Goal).status === 'active').length;
}

/* ------------------------------- Missions ------------------------------ */

/** Single-field query (no composite index needed) + in-memory date filter. */
export function subscribeMissionsForDate(uid: string, date: string, cb: (missions: Mission[]) => void): Unsubscribe {
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'missions'), where('ownerId', '==', uid));
  return onSnapshot(q, (snap) => {
    const missions = snap.docs
      .map((d) => ({ ...(d.data() as Mission), id: d.id }))
      .filter((m) => m.date === date)
      .sort((a, b) => a.createdAt - b.createdAt);
    cb(missions);
  });
}

export async function updateMissionStatus(missionId: string, status: MissionStatus): Promise<void> {
  const db = getFirestoreDb()!;
  await updateDoc(doc(db, 'missions', missionId), {
    status,
    completedAt: status === 'done' ? Date.now() : null,
  });
}

export interface MissionHistoryItem {
  mission: Mission;
}

export async function fetchMissionsSince(uid: string, sinceDate: string, maxDays: number): Promise<Mission[]> {
  const db = getFirestoreDb()!;
  // Single-field query + in-memory filtering (composite-index free).
  const q = query(collection(db, 'missions'), where('ownerId', '==', uid), limit(400));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ ...(d.data() as Mission), id: d.id }))
    .filter((m) => m.date >= sinceDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxDays * 6);
}

export async function saveDailyPlan(uid: string, date: string, missionIds: string[]): Promise<void> {
  const db = getFirestoreDb()!;
  const plan: Omit<DailyPlan, 'id'> = { ownerId: uid, date, missionIds, generatedAt: Date.now() };
  await setDoc(doc(db, 'dailyPlans', `${uid}_${date}`), plan, { merge: true });
}

export async function fetchDailyPlan(uid: string, date: string): Promise<DailyPlan | null> {
  const db = getFirestoreDb()!;
  const snap = await getDoc(doc(db, 'dailyPlans', `${uid}_${date}`));
  return snap.exists() ? ({ ...(snap.data() as DailyPlan) } as DailyPlan) : null;
}

/* ------------------------------- Reviews ------------------------------- */

export async function fetchReview(uid: string, date: string): Promise<DailyReview | null> {
  const db = getFirestoreDb()!;
  const snap = await getDoc(doc(db, 'dailyReviews', `${uid}_${date}`));
  return snap.exists() ? (snap.data() as DailyReview) : null;
}

export async function saveReviewBase(
  uid: string,
  date: string,
  data: { accomplished: string; difficult: string; improve: string; comment: string },
): Promise<void> {
  const db = getFirestoreDb()!;
  await setDoc(
    doc(db, 'dailyReviews', `${uid}_${date}`),
    { ownerId: uid, date, ...data, aiSummary: null, aiAdjustments: null, aiFocus: null, createdAt: Date.now() },
    { merge: true },
  );
}

/* ----------------------------- Conversations ---------------------------- */

export async function createConversation(uid: string, language: string, title: string): Promise<string> {
  const db = getFirestoreDb()!;
  const ref = await addDoc(collection(db, 'conversations'), {
    ownerId: uid,
    title,
    engine: 'coach',
    language,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export function subscribeMessages(conversationId: string, cb: (messages: { id: string; role: 'user' | 'assistant'; content: string; createdAt: number }[]) => void): Unsubscribe {
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'), limit(100));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as { role: 'user' | 'assistant'; content: string; createdAt: number }) }))),
  );
}

export async function addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  const db = getFirestoreDb()!;
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), { role, content, createdAt: Date.now() });
  await updateDoc(doc(db, 'conversations', conversationId), { updatedAt: Date.now() });
}

export async function fetchConversation(uid: string): Promise<Conversation | null> {
  const db = getFirestoreDb()!;
  const q = query(collection(db, 'conversations'), where('ownerId', '==', uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const latest = snap.docs
    .map((d) => ({ ...(d.data() as Conversation), id: d.id }))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return latest;
}

/* --------------------------------- Usage -------------------------------- */

export async function fetchUsage(uid: string, date: string): Promise<UsageDay> {
  const db = getFirestoreDb()!;
  const snap = await getDoc(doc(db, 'users', uid, 'usage', date));
  return snap.exists() ? (snap.data() as UsageDay) : { date, coachMessages: 0, aiCalls: 0 };
}

/* ------------------------------- Feedback ------------------------------- */

export async function addFeedback(uid: string, category: 'bug' | 'idea' | 'other', message: string): Promise<void> {
  const db = getFirestoreDb()!;
  await addDoc(collection(db, 'feedbacks'), { ownerId: uid, category, message, createdAt: Date.now() });
}

/* --------------------------- Account deletion --------------------------- */

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Deletes every document owned by the user, INCLUDING sub-collections
 * (conversation messages, usage days). Firestore does not cascade deletes,
 * so each child collection is enumerated explicitly.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  const db = getFirestoreDb()!;

  const topLevel: { col: string; filter: 'ownerId' }[] = [
    { col: 'goals', filter: 'ownerId' },
    { col: 'missions', filter: 'ownerId' },
    { col: 'dailyPlans', filter: 'ownerId' },
    { col: 'dailyReviews', filter: 'ownerId' },
    { col: 'conversations', filter: 'ownerId' },
    { col: 'feedbacks', filter: 'ownerId' },
  ];

  for (const { col } of topLevel) {
    const q = query(collection(db, col), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    if (col === 'conversations') {
      // Messages sub-collection of every conversation must be removed too.
      for (const d of snap.docs) {
        const msgSnap = await getDocs(collection(db, 'conversations', d.id, 'messages'));
        for (const batch of chunk(msgSnap.docs, 400)) {
          const b = writeBatch(db);
          for (const m of batch) b.delete(m.ref);
          await b.commit();
        }
      }
    }
    for (const batch of chunk(snap.docs, 400)) {
      const b = writeBatch(db);
      for (const d of batch) b.delete(d.ref);
      await b.commit();
    }
  }

  // Usage days (sub-collection of users/{uid}).
  const usageSnap = await getDocs(collection(db, 'users', uid, 'usage'));
  for (const batch of chunk(usageSnap.docs, 400)) {
    const b = writeBatch(db);
    for (const d of batch) b.delete(d.ref);
    await b.commit();
  }

  await deleteDoc(doc(db, 'users', uid));
}
