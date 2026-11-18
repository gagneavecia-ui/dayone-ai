'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AdminError, AdminHeader, AdminLoading, useAdminSection } from '@/components/admin/admin-kit';
import { useI18n } from '@/lib/i18n';

interface Point {
  date: string;
  count: number;
}

export default function AdminAnalyticsPage() {
  const { data, loading, reload } = useAdminSection<{ series: Point[] }>('analytics');
  const { t } = useI18n();

  const series = data?.series ?? [];
  const max = Math.max(1, ...series.map((p) => p.count));
  const total = series.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-6">
      <AdminHeader titleKey="admin.analytics" subtitleKey="admin.subtitle" />
      {loading ? (
        <AdminLoading />
      ) : data ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium">{t('admin.weeklyCompleted')}</p>
              <p className="mt-1 text-3xl font-bold text-primary">{total}</p>
            </CardContent>
          </Card>
          {series.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.noData')}</p>
          ) : (
            <div className="space-y-2">
              {series.slice().reverse().map((p) => (
                <div key={p.date} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">{p.date}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-success" style={{ width: `${Math.max(2, (p.count / max) * 100)}%` }} />
                  </div>
                  <span className="w-10 text-right tabular-nums">{p.count}</span>
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
