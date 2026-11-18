'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Sparkles, Target, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MissionCard } from '@/components/app/mission-card';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { localDateFor } from '@/lib/date';
import { fetchMissionsSince, subscribeGoals, subscribeMissionsForDate, updateMissionStatus } from '@/lib/db/services';
import { apiFetch } from '@/lib/client-api';
import type { Goal, Mission, MissionStatus } from '@/types';

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const timezone = profile?.timezone || 'UTC';

  const [today, setToday] = useState(() => localDateFor('UTC'));
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [weekMissions, setWeekMissions] = useState<Mission[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setToday(localDateFor(timezone));
  }, [timezone]);

  useEffect(() => {
    if (!profile) return;
    const unsubM = subscribeMissionsForDate(profile.uid, today, setMissions);
    const unsubG = subscribeGoals(profile.uid, 'active', setGoals);
    return () => {
      unsubM();
      unsubG();
    };
  }, [profile, today]);

  useEffect(() => {
    if (!profile) return;
    const cutoff = localDateFor('UTC', new Date(Date.now() - 7 * 86_400_000));
    fetchMissionsSince(profile.uid, cutoff, 7)
      .then(setWeekMissions)
      .catch(() => undefined);
  }, [profile, today, missions?.length]);

  const doneCount = missions?.filter((m) => m.status === 'done').length ?? 0;
  const nextMission = missions?.find((m) => m.status !== 'done');
  const overallProgress = useMemo(() => {
    if (!goals || goals.length === 0) return 0;
    return Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);
  }, [goals]);
  const weekDone = weekMissions.filter((m) => m.status === 'done').length;
  const streak = useMemo(() => {
    const dates = Array.from(new Set(weekMissions.filter((m) => m.status === 'done').map((m) => m.date))).sort().reverse();
    if (dates.length === 0) return 0;
    let count = 0;
    let cursor = localDateFor('UTC', new Date());
    for (;;) {
      if (dates.includes(cursor)) {
        count += 1;
        const d = new Date(`${cursor}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 1);
        cursor = d.toISOString().slice(0, 10);
      } else break;
    }
    return count;
  }, [weekMissions]);

  const greeting = useMemo(() => {
    const hour = Number(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date()),
    );
    if (hour < 12) return t('dashboard.goodMorning');
    if (hour < 18) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  }, [t, timezone]);

  const onStatusChange = useCallback(
    async (missionId: string, status: MissionStatus) => {
      try {
        await updateMissionStatus(missionId, status);
        if (status === 'done') toast.success(t('missions.done'));
      } catch {
        toast.error(t('errors.generic'));
      }
    },
    [t],
  );

  async function generatePlan() {
    if (!profile) return;
    setGenerating(true);
    try {
      await apiFetch<{ missionIds: string[] }>('/api/ai/missions', { method: 'POST', body: JSON.stringify({}) });
      toast.success(t('missions.title'));
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'quota_reached') toast.warning(t('missions.quotaReached'));
      else if (code === 'no_goals') toast.info(t('dashboard.noGoals'));
      else if (code === 'ai_not_configured' || code === 'firebase_not_configured') toast.warning(t('errors.firebaseMissing'));
      else toast.error(t('errors.aiUnavailable'));
    } finally {
      setGenerating(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {profile.displayName || '…'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {profile.plan === 'premium' ? t('common.premium') : t('common.free')}
        </Badge>
      </header>

      {/* Today's missions */}
      <section aria-labelledby="today-missions">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="today-missions" className="font-semibold">
            {t('dashboard.todayMissions')}
          </h2>
          {missions && missions.length > 0 ? (
            <Badge variant="outline" className={doneCount === missions.length ? 'border-success/50 text-success' : ''}>
              {doneCount}/{missions.length}
            </Badge>
          ) : null}
        </div>
        {missions === null ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : missions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12">
                <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
              </span>
              <p className="font-medium">{t('dashboard.noMissionsToday')}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.noMissionsHint')}</p>
              <Button onClick={generatePlan} disabled={generating || (goals !== null && goals.length === 0)}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {generating ? t('dashboard.generating') : t('dashboard.generatePlan')}
              </Button>
              {goals !== null && goals.length === 0 ? (
                <Button asChild variant="ghost" size="sm" className="text-primary">
                  <Link href="/goals">
                    <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('dashboard.createFirstGoal')}
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : missions.length > 0 ? (
          <div className="space-y-3">
            {missions.map((m) => (
              <MissionCard key={m.id} mission={m} compact onStatusChange={(s) => onStatusChange(m.id, s)} />
            ))}
          </div>
        ) : null}
        {missions !== null && missions.length > 0 && doneCount === missions.length ? (
          <Card className="border-success/30">
            <CardContent className="p-6 text-center">
              <p className="font-medium text-success">{t('dashboard.allDone')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.allDoneSub')}</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/review">{t('nav.review')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {/* Stats row */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Statistics">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('dashboard.overallProgress')}</p>
            <div className="mt-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-2xl font-bold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('progress.streak')}</p>
            <p className="mt-2 text-2xl font-bold">
              {streak} <span className="text-sm font-normal text-muted-foreground">{t('dashboard.streakDays')}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('dashboard.completedThisWeek')}</p>
            <p className="mt-2 text-2xl font-bold">{weekDone}</p>
          </CardContent>
        </Card>
      </section>

      {/* Next action + coach */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('dashboard.nextAction')}</p>
            {nextMission ? (
              <>
                <p className="mt-2 line-clamp-2 font-medium">{nextMission.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nextMission.durationMin} {t('common.min')} · {t(`missions.${nextMission.priority}`)}
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href="/missions">{t('nav.missions')}</Link>
                </Button>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{t('dashboard.noMissionsToday')}</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="font-medium">{t('dashboard.coachCtaTitle')}</p>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{t('dashboard.coachCtaSub')}</p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/coach">{t('dashboard.askCoach')}</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Active goals */}
      <section aria-labelledby="active-goals">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="active-goals" className="font-semibold">
            {t('dashboard.activeGoals')}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/goals">{t('common.seeAll')}</Link>
          </Button>
        </div>
        {goals === null ? (
          <Skeleton className="h-20 w-full" />
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <Target className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{t('dashboard.noGoals')}</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/goals">
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t('dashboard.createFirstGoal')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {goals.slice(0, 4).map((g) => (
              <li key={g.id}>
                <Link href="/goals" className="block">
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{g.title}</p>
                        <span className="text-xs text-muted-foreground">{g.progress}%</span>
                      </div>
                      <Progress value={g.progress} className="mt-2.5" />
                      <p className="mt-2 text-xs text-muted-foreground" lang={lang}>
                        {g.steps.filter((s) => s.done).length}/{g.steps.length} {t('goals.markDone')}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
