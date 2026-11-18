'use client';

import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { useI18n } from '@/lib/i18n';

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="bg-glow-hero flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-3" aria-label="DAYONE AI home">
        <Logo size="lg" />
        <span className="text-xl font-bold tracking-tight">
          DAYONE<span className="text-primary"> AI</span>
        </span>
      </Link>
      {children}
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">{t('common.slogan')}</p>
    </div>
  );
}
