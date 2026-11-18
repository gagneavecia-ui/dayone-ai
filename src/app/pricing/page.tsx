'use client';

import { PublicNavbar } from '@/components/shared/public-navbar';
import { PublicFooter } from '@/components/shared/public-footer';
import { PricingCards } from '@/components/shared/pricing-cards';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';

const FAQ = [
  { qKey: 'pricing.q1', aKey: 'pricing.a1' },
  { qKey: 'pricing.q2', aKey: 'pricing.a2' },
  { qKey: 'pricing.q3', aKey: 'pricing.a3' },
];

export default function PricingPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1 bg-glow-hero">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('pricing.title')}</h1>
            <p className="mt-3 text-[15px] text-muted-foreground">{t('pricing.subtitle')}</p>
          </div>
          <PricingCards />

          <section className="mt-16">
            <h2 className="mb-6 text-center text-xl font-semibold">{t('pricing.faqTitle')}</h2>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <Card key={item.qKey}>
                  <CardContent className="p-5">
                    <h3 className="font-medium">{t(item.qKey)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(item.aKey)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
