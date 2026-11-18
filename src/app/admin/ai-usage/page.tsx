'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AdminError, AdminHeader, AdminLoading, useAdminSection } from '@/components/admin/admin-kit';
import { useI18n } from '@/lib/i18n';

interface UsagePoint {
  date: string;
  coach: number;
  missions: number;
}

export default function AdminAiUsagePage() {
  const { data, loading, reload } = useAdminSection<{ series: UsagePoint[] }>('usage');
  const { t } = useI18n();

  const series = data?.series ?? [];
  const max = Math.max(1, ...series.map((p) => p.coach + p.missions));

  return (
    <div className="space-y-6">
      <AdminHeader titleKey="admin.aiUsage" subtitleKey="admin.subtitle" />
      {loading ? (
        <AdminLoading />
      ) : data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('coach.title')}</p>
                <p className="mt-2 text-2xl font-bold">{series.reduce((s, p) => s + p.coach, 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('missions.generateToday')}</p>
                <p className="mt-2 text-2xl font-bold">{series.reduce((s, p) => s + p.missions, 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.statAiToday')}</p>
                <p className="mt-2 text-2xl font-bold">
                  {series.length > 0 ? series[series.length - 1].coach + series[series.length - 1].missions : 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {series.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.noData')}</p>
          ) : (
            <div className="space-y-2">
              {series.slice().reverse().map((p) => (
                <div key={p.date} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">{p.date}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(2, ((p.coach + p.missions) / max) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right tabular-nums">{p.coach + p.missions}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <AdminError onRetry={reload} />
      )}
    </div>
  );
}
