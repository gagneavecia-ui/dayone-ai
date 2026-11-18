'use client';

import { PublicNavbar } from '@/components/shared/public-navbar';
import { PublicFooter } from '@/components/shared/public-footer';
import { useI18n } from '@/lib/i18n';

export interface LegalSection {
  titleKey: string;
  bodyKey: string;
}

export function LegalPage({
  titleKey,
  sections,
}: {
  titleKey: string;
  sections: LegalSection[];
}) {
  const { t } = useI18n();
  const updated = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date('2026-11-19'),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight">{t(titleKey)}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('legal.updated', { d: updated })}</p>
          <div className="mt-10 space-y-8">
            {sections.map((s) => (
              <section key={s.titleKey}>
                <h2 className="text-lg font-semibold">{t(s.titleKey)}</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{t(s.bodyKey)}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
