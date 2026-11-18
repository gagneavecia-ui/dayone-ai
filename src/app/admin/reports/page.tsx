'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AdminError, AdminHeader, AdminLoading, useAdminSection } from '@/components/admin/admin-kit';
import { useI18n, useDateFormatter } from '@/lib/i18n';
import type { FeedbackDoc } from '@/types';

export default function AdminReportsPage() {
  const { data, loading, reload } = useAdminSection<{ reports: FeedbackDoc[] }>('reports');
  const { t } = useI18n();
  const { formatDate } = useDateFormatter();

  return (
    <div className="space-y-6">
      <AdminHeader titleKey="admin.reports" subtitleKey="admin.subtitle" />
      {loading ? (
        <AdminLoading />
      ) : data ? (
        <div className="space-y-3">
          {data.reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.noData')}</p>
          ) : (
            data.reports.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className={r.category === 'bug' ? 'border-destructive/40 text-destructive' : 'border-primary/40 text-primary'}>
                      {r.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{r.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">uid: {r.ownerId}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <AdminError onRetry={reload} />
      )}
    </div>
  );
}
