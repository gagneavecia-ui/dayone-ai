'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AdminError, AdminHeader, AdminLoading, useAdminSection } from '@/components/admin/admin-kit';
import { useI18n } from '@/lib/i18n';

interface Subs {
  free: number;
  premium: number;
  total: number;
  premiumShare: number;
}

export default function AdminSubscriptionsPage() {
  const { data, loading, reload } = useAdminSection<Subs>('subscriptions');
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <AdminHeader titleKey="admin.subscriptions" subtitleKey="admin.subtitle" />
      {loading ? (
        <AdminLoading />
      ) : data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.statUsers')}</p>
                <p className="mt-2 text-2xl font-bold">{data.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('common.free')}</p>
                <p className="mt-2 text-2xl font-bold">{data.free}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('common.premium')}</p>
                <p className="mt-2 text-2xl font-bold text-primary">{data.premium}</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{t('admin.premiumShare')}</span>
                <span className="text-primary">{data.premiumShare}%</span>
              </div>
              <Progress value={data.premiumShare} />
              <p className="mt-3 text-xs text-muted-foreground">{t('pricing.soon')}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <AdminError onRetry={reload} />
      )}
    </div>
  );
}
