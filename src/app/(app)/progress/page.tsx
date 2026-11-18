'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Flame, Lock, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { addDays, localDateFor } from '@/lib/date';
import { fetchMissionsSince, subscribeGoals } from '@/lib/db/services';
import { PLAN_LIMITS } from '@/lib/plans';
import type { Goal, Mission } from '@/types';

export default function ProgressPage() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();

  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [range, setRange] = useState<7 | 30>(7);

  const historyDays = profile?.plan === 'premium' ? PLAN_LIMITS.premium.historyDays : PLAN_LIMITS.free.historyDays;

  useEffect(() => {
    if (!profile) return;
    setRange(historyDays >= 30 ? 7 : 7);
  }, [profile, historyDays]);

  useEffect(() => {
    if (!profile) return;
    const cutoff = localDateFor('UTC', new Date(Date.now() - (range + 1) * 86_400_000));
    fetchMissionsSince(profile.uid, cutoff, range)
      .then(setMissions)
      .catch(() => setMissions([]));
  }, [profile, range]);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeGoals(profile.uid, 'active', setGoals);
    return () => unsub();
  }, [profile]);

  const perDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of missions ?? []) {
      if (m.status === 'done') counts[m.date] = (counts[m.date] ?? 0) + 1;
    }
    const days: { date: string; label: string; count: number }[] = [];
    const today = localDateFor('UTC');
    for (let i = range - 1; i >= 0; i -= 1) {
      const date = addDays(today, -i);
      days.push({
        date,
        label: new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : 'es-ES', {
          day: 'numeric',
          month: 'short',
        }).format(new Date(`${date}T12:00:00Z`)),
        count: counts[date] ?? 0,
      });
    }
    return days;
  }, [missions, range, lang]);

  const totalDone = useMemo(() => (missions ?? []).filter((m) => m.status === 'done').length, [missions]);
  const weekDone = useMemo(() => {
    const cutoff = addDays(localDateFor('UTC'), -6);
    return (missions ?? []).filter((m) => m.status === 'done' && m.date >= cutoff).length;
  }, [missions]);
  const streak = useMemo(() => {
    const dates = Array.from(new Set((missions ?? []).filter((m) => m.status === 'done').map((m) => m.date))).sort().reverse();
    if (dates.length === 0) return 0;
    let count = 0;
    let cursor = localDateFor('UTC');
    for (;;) {
      if (dates.includes(cursor)) {
        count += 1;
        cursor = addDays(cursor, -1);
      } else break;
    }
    return count;
  }, [missions]);

  const maxCount = Math.max(1, ...perDay.map((d) => d.count));

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('progress.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('progress.subtitle')}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('progress.totalCompleted')}</p>
            {missions === null ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
                {totalDone}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('progress.thisWeek')}</p>
            {missions === null ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-2 text-2xl font-bold">{weekDone}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('progress.streak')}</p>
            {missions === null ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
                <Flame className="h-5 w-5 text-success" aria-hidden="true" />
                {streak}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <BarChart3 className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              {t('progress.weeklyChart')}
            </h2>
            <div className="flex items-center gap-2">
              {range === 7 ? null : (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {t('progress.lastDays', { n: range })}
                </Badge>
              )}
            </div>
          </div>
          {missions === null ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label={t('progress.weeklyChart')}>
              {perDay.map((d) => (
                <div key={d.date} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
                    {d.count}
                  </span>
                  <div
                    className={`w-full max-w-8 rounded-t-md transition-all ${d.count > 0 ? 'bg-primary' : 'bg-secondary'}`}
                    style={{ height: `${Math.max(4, (d.count / maxCount) * 100)}%` }}
                  />
                  <span className="w-full truncate text-center text-[10px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 30-day upsell for free accounts */}
      {historyDays < 30 ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <Lock className="h-6 w-6 text-primary" aria-hidden="true" />
            <p className="font-medium">{t('progress.historyLockedTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('progress.historyLockedDesc')}</p>
            <Button asChild size="sm" variant="outline" className="mt-1 border-primary/40 text-primary">
              <a href="/pricing">{t('progress.title')} — Premium</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setRange(range === 7 ? 30 : 7)}>
            {range === 7 ? t('progress.lastDays', { n: 30 }) : t('progress.lastDays', { n: 7 })}
          </Button>
        </div>
      )}

      <section aria-labelledby="goals-progress">
        <h2 id="goals-progress" className="mb-3 font-semibold">
          {t('progress.goalsProgress')}
        </h2>
        {goals === null ? (
          <Skeleton className="h-24 w-full" />
        ) : goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('progress.noData')}</p>
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => (
              <li key={g.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{g.title}</p>
                      <span className="text-sm font-semibold text-primary">{g.progress}%</span>
                    </div>
                    <Progress value={g.progress} className="mt-2" />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
