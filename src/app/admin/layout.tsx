'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { SetupNotice } from '@/components/shared/setup-notice';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';

/**
 * Client-side guard for the admin area. Authorization is enforced AGAIN on
 * every admin API call (custom claims checked server-side via the Admin SDK).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, firebaseReady } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!loading && firebaseReady && !user) router.replace('/login?next=%2Fadmin');
  }, [loading, firebaseReady, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span className="text-sm">{t('common.loading')}</span>
      </div>
    );
  }
  if (!firebaseReady) {
    return (
      <div className="bg-glow-hero flex min-h-screen items-center justify-center px-4">
        <SetupNotice />
      </div>
    );
  }
  if (role !== 'admin' && role !== 'super_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/12">
            <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-bold">{t('admin.notAdmin')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.notAdminDesc')}</p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
