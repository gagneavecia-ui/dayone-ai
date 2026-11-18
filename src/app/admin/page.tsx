'use client';

import Link from 'next/link';
import { Users, Cpu, CheckCircle2, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { AdminError, AdminHeader, AdminLoading, useAdminSection } from '@/components/admin/admin-kit';

interface Stats {
  users: number;
  activeGoals: number;
  missionsToday: number;
  aiCallsToday: number;
}

const CARDS = [
  { key: 'admin.statUsers', icon: Users, field: 'users' as const },
  { key: 'admin.statGoals', icon: Target, field: 'activeGoals' as const },
  { key: 'admin.statMissionsToday', icon: CheckCircle2, field: 'missionsToday' as const },
  { key: 'admin.statAiToday', icon: Cpu, field: 'aiCallsToday' as const },
];

export default function AdminOverviewPage() {
  const { data, loading, reload } = useAdminSection<Stats>('stats');
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <AdminHeader titleKey="admin.title" subtitleKey="admin.subtitle" />
      {loading ? (
        <AdminLoading />
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <Card key={c.key}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t(c.key)}</p>
                <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
                  <c.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  {data[c.field]}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <AdminError onRetry={reload} />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: '/admin/users', labelKey: 'admin.users' },
          { href: '/admin/ai-usage', labelKey: 'admin.aiUsage' },
          { href: '/admin/configuration', labelKey: 'admin.configuration' },
          { href: '/admin/audit-logs', labelKey: 'admin.auditLogs' },
        ].map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="p-4 text-sm font-medium">{t(l.labelKey)} →</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
