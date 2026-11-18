'use client';

import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { useI18n } from '@/lib/i18n';

export function PublicFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/60 bg-sidebar">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" />
              <span className="text-sm font-bold">
                DAYONE<span className="text-primary"> AI</span>
              </span>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">{t('landing.footerTagline')}</p>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground">
              {t('nav.pricing')}
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground">
              {t('legal.privacyTitle')}
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground">
              {t('legal.termsTitle')}
            </Link>
          </nav>
        </div>
        <p className="mt-8 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
          {t('landing.disclaimer')}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          © {year} DAYONE AI — {t('landing.badge')}
        </p>
      </div>
    </footer>
  );
}
