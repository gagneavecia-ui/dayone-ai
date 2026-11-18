'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { SetupNotice } from '@/components/shared/setup-notice';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';

function FullScreenLoader() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span className="text-sm">{t('common.loading')}</span>
    </div>
  );
}

/**
 * Server-first protection for the private area: unauthenticated users are
 * redirected (middleware + this guard), profiles without onboarding go to
 * /onboarding. Real authorization still happens on every API call.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, firebaseReady, profile, profileLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !user) return;
    if (profileLoaded && !profile) {
      router.replace('/onboarding');
      return;
    }
    if (profile && profile.onboardingComplete === false && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [loading, user, profile, profileLoaded, pathname, router]);

  if (loading) return <FullScreenLoader />;
  if (!firebaseReady) {
    return (
      <div className="bg-glow-hero flex min-h-screen items-center justify-center px-4">
        <SetupNotice />
      </div>
    );
  }
  if (!user) return <FullScreenLoader />;

  return <AppShell>{children}</AppShell>;
}
