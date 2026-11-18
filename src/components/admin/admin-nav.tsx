'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Cpu, CreditCard, ChartColumn, Flag, Settings, ScrollText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', labelKey: 'admin.overview', icon: LayoutDashboard },
  { href: '/admin/users', labelKey: 'admin.users', icon: Users },
  { href: '/admin/ai-usage', labelKey: 'admin.aiUsage', icon: Cpu },
  { href: '/admin/subscriptions', labelKey: 'admin.subscriptions', icon: CreditCard },
  { href: '/admin/analytics', labelKey: 'admin.analytics', icon: ChartColumn },
  { href: '/admin/reports', labelKey: 'admin.reports', icon: Flag },
  { href: '/admin/configuration', labelKey: 'admin.configuration', icon: Settings },
  { href: '/admin/audit-logs', labelKey: 'admin.auditLogs', icon: ScrollText },
];

export function AdminNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="scrollbar-slim -mx-1 flex gap-1 overflow-x-auto pb-1">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary/12 font-medium text-primary'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
