import { requireAdmin, jsonError } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { localDateFor } from '@/lib/date';
import type { AuditLog, DailyReview, FeedbackDoc, Goal, Mission, UserProfile } from '@/types';

const SECTIONS = ['stats', 'users', 'usage', 'subscriptions', 'analytics', 'reports', 'config', 'audit'] as const;
type Section = (typeof SECTIONS)[number];

function isSection(value: string | null): value is Section {
  return value !== null && (SECTIONS as readonly string[]).includes(value);
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return jsonError(auth.status, auth.code, auth.message);

  const db = getAdminDb();
  if (!db) return jsonError(503, 'firebase_not_configured');

  const section = new URL(req.url).searchParams.get('section');
  if (!isSection(section)) return jsonError(400, 'invalid_section');

  try {
    switch (section) {
      case 'stats': {
        const [users, goals, missionsToday] = await Promise.all([
          db.collection('users').count().get(),
          db.collection('goals').where('status', '==', 'active').count().get(),
          db.collection('missions').where('status', '==', 'done').where('date', '==', localDateFor('UTC')).count().get(),
        ]);
        const usageDoc = await db.collection('globalMetrics').doc('aiUsage').get();
        const days = (usageDoc.data()?.days as Record<string, { coach: number; missions: number }> | undefined) ?? {};
        const today = days[localDateFor('UTC')] ?? { coach: 0, missions: 0 };
        return Response.json({
          users: users.data().count,
          activeGoals: goals.data().count,
          missionsToday: missionsToday.data().count,
          aiCallsToday: today.coach + today.missions,
        });
      }
      case 'users': {
        const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(50).get();
        const users = snap.docs.map((d) => {
          const u = d.data() as UserProfile;
          return { ...u, id: d.id };
        });
        return Response.json({ users });
      }
      case 'subscriptions': {
        const [free, premium] = await Promise.all([
          db.collection('users').where('plan', '==', 'free').count().get(),
          db.collection('users').where('plan', '==', 'premium').count().get(),
        ]);
        const f = free.data().count;
        const p = premium.data().count;
        return Response.json({ free: f, premium: p, total: f + p, premiumShare: f + p > 0 ? Math.round((p / (f + p)) * 100) : 0 });
      }
      case 'usage': {
        const docSnap = await db.collection('globalMetrics').doc('aiUsage').get();
        const days = (docSnap.data()?.days as Record<string, { coach: number; missions: number }> | undefined) ?? {};
        const series = Object.entries(days)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-30)
          .map(([date, v]) => ({ date, ...v }));
        return Response.json({ series });
      }
      case 'analytics': {
        const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
        const snap = await db
          .collection('missions')
          .where('status', '==', 'done')
          .where('date', '>=', cutoff)
          .get();
        const perDate: Record<string, number> = {};
        for (const d of snap.docs) {
          const m = d.data() as Mission;
          perDate[m.date] = (perDate[m.date] ?? 0) + 1;
        }
        const series = Object.entries(perDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count }));
        return Response.json({ series });
      }
      case 'reports': {
        const snap = await db.collection('feedbacks').orderBy('createdAt', 'desc').limit(20).get();
        const reports = snap.docs.map((d) => ({ ...(d.data() as FeedbackDoc), id: d.id }));
        return Response.json({ reports });
      }
      case 'config': {
        const snap = await db.collection('systemConfig').doc('quotas').get();
        return Response.json({ config: snap.exists ? snap.data() : null });
      }
      case 'audit': {
        const snap = await db.collection('auditLogs').orderBy('createdAt', 'desc').limit(50).get();
        const logs = snap.docs.map((d) => ({ ...(d.data() as AuditLog), id: d.id }));
        return Response.json({ logs });
      }
      default:
        return jsonError(400, 'invalid_section');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Missing Firestore indexes surface here with a clear hint.
    return jsonError(500, 'admin_query_failed', message.includes('index') ? 'A Firestore index is missing (see firestore.indexes.json).' : undefined);
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
