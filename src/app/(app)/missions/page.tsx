'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Loader2, ListChecks, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MissionCard } from '@/components/app/mission-card';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n, useDateFormatter } from '@/lib/i18n';
import { localDateFor } from '@/lib/date';
import { fetchMissionsSince, subscribeMissionsForDate, updateMissionStatus } from '@/lib/db/services';
import { apiFetch } from '@/lib/client-api';
import type { Mission, MissionStatus } from '@/types';

export default function MissionsPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { formatDate } = useDateFormatter();
  const timezone = profile?.timezone || 'UTC';

  const [today, setToday] = useState(() => localDateFor('UTC'));
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [history, setHistory] = useState<Mission[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setToday(localDateFor(timezone));
  }, [timezone]);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeMissionsForDate(profile.uid, today, setMissions);
    return () => unsub();
  }, [profile, today]);

  useEffect(() => {
    if (!profile) return;
    const cutoff = localDateFor('UTC', new Date(Date.now() - 8 * 86_400_000));
    fetchMissionsSince(profile.uid, cutoff, 8)
      .then((all) => setHistory(all.filter((m) => m.date !== today)))
      .catch(() => undefined);
  }, [profile, today, missions?.length]);

  const onStatusChange = useCallback(
    async (missionId: string, status: MissionStatus) => {
      try {
        await updateMissionStatus(missionId, status);
      } catch {
        toast.error(t('errors.generic'));
      }
    },
    [t],
  );

  async function generate() {
    setGenerating(true);
    try {
      await apiFetch<{ missionIds: string[] }>('/api/ai/missions', { method: 'POST', body: JSON.stringify({}) });
      toast.success(t('missions.title'));
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'quota_reached') toast.warning(t('missions.quotaReached'), { description: t('missions.quotaReachedSub') });
      else if (code === 'no_goals') toast.info(t('goals.emptySub'));
      else if (code === 'ai_not_configured' || code === 'firebase_not_configured') toast.warning(t('errors.firebaseMissing'));
      else toast.error(t('errors.aiUnavailable'));
    } finally {
      setGenerating(false);
    }
  }

  const historyByDate = history.reduce<Record<string, Mission[]>>((acc, m) => {
    (acc[m.date] ??= []).push(m);
    return acc;
  }, {});
  const historyDates = Object.keys(historyByDate).sort().reverse().slice(0, 7);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('missions.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('missions.subtitle')} · {formatDate(today)}
          </p>
        </div>
        <Button onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />}
          {generating ? t('missions.regenerating') : t('missions.generateToday')}
        </Button>
      </header>

      {missions === null ? (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : missions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <ListChecks className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">{t('missions.emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('missions.emptySub')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {missions.map((m) => (
            <MissionCard key={m.id} mission={m} onStatusChange={(s) => onStatusChange(m.id, s)} />
          ))}
        </div>
      )}

      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 flex items-center gap-2 font-semibold">
          <CalendarDays className="h-4.5 w-4.5 text-muted-foreground" aria-hidden="true" />
          {t('missions.history')}
        </h2>
        {historyDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('missions.noHistory')}</p>
        ) : (
          <div className="space-y-4">
            {historyDates.map((date) => {
              const dayMissions = historyByDate[date];
              const done = dayMissions.filter((m) => m.status === 'done').length;
              return (
                <div key={date}>
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <span className="font-medium">{formatDate(date)}</span>
                    <span className="text-muted-foreground">
                      {done}/{dayMissions.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {dayMissions.map((m) => (
                      <MissionCard key={m.id} mission={m} compact />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        <Link href="/coach" className="text-primary hover:underline">
          {t('nav.coach')}
        </Link>{' '}
        — {t('coach.contextHint')}
      </p>
    </div>
  );
}
