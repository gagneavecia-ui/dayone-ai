'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Compass,
  ListChecks,
  NotebookPen,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PublicNavbar } from '@/components/shared/public-navbar';
import { PublicFooter } from '@/components/shared/public-footer';
import { PricingCards } from '@/components/shared/pricing-cards';
import { useI18n } from '@/lib/i18n';

const LOOP_STEPS = [
  { icon: Compass, titleKey: 'landing.planTitle', descKey: 'landing.planDesc' },
  { icon: CalendarCheck, titleKey: 'landing.actTitle', descKey: 'landing.actDesc' },
  { icon: TrendingUp, titleKey: 'landing.progressTitle', descKey: 'landing.progressDesc' },
];

const FEATURES = [
  { icon: ListChecks, titleKey: 'landing.f1Title', descKey: 'landing.f1Desc' },
  { icon: Sparkles, titleKey: 'landing.f2Title', descKey: 'landing.f2Desc' },
  { icon: BarChart3, titleKey: 'landing.f3Title', descKey: 'landing.f3Desc' },
  { icon: NotebookPen, titleKey: 'landing.f4Title', descKey: 'landing.f4Desc' },
  { icon: Smartphone, titleKey: 'landing.f5Title', descKey: 'landing.f5Desc' },
  { icon: ShieldCheck, titleKey: 'landing.f6Title', descKey: 'landing.f6Desc' },
];

const STEPS = [
  { titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
  { titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
  { titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' },
];

const MOCKUP_MISSIONS = [
  { key: 'landing.mockupM1', duration: '15 min', done: false },
  { key: 'landing.mockupM2', duration: '10 min', done: false },
  { key: 'landing.mockupM3', duration: '20 min', done: true },
];

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function MissionMockup() {
  const { t } = useI18n();
  return (
    <Card className="relative z-10 mx-auto w-full max-w-md border-border/80 bg-card/90 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">{t('landing.mockupToday')}</p>
          <Badge variant="outline" className="border-success/40 text-success">
            2/3
          </Badge>
        </div>
        <ul className="space-y-2.5">
          {MOCKUP_MISSIONS.map((m, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-3"
            >
              <CheckCircle2
                className={`h-5 w-5 shrink-0 ${m.done ? 'text-success' : 'text-muted-foreground/50'}`}
                aria-hidden="true"
              />
              <span className={`flex-1 text-sm ${m.done ? 'text-muted-foreground line-through' : ''}`}>
                {t(m.key)}
              </span>
              <span className="text-xs text-muted-foreground">{m.duration}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-2.5">
          <span className="text-xs font-medium text-primary">{t('landing.mockupDone')} · streak 6</span>
          <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-glow-hero">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-2 lg:gap-8 lg:pb-24">
            <div className="text-center lg:text-left">
              <Badge variant="outline" className="mb-5 border-primary/40 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-primary">
                {t('landing.badge')}
              </Badge>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                {t('landing.title1')}
                <br />
                <span className="text-gradient-primary">{t('landing.title2')}</span>
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-[17px] lg:mx-0">
                {t('landing.subtitle')}
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/register">
                    {t('landing.ctaPrimary')}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="/pricing">{t('landing.ctaSecondary')}</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{t('landing.ctaSubtitle')}</p>
            </div>
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-0 mx-auto h-full max-w-sm rounded-full bg-primary/20 blur-[80px]"
              />
              <MissionMockup />
            </div>
          </div>
        </section>

        {/* Loop */}
        <section className="border-t border-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle title={t('landing.loopTitle')} subtitle={t('landing.loopSubtitle')} />
            <div className="grid gap-5 md:grid-cols-3">
              {LOOP_STEPS.map((step, i) => (
                <Card key={step.titleKey} className="relative overflow-hidden">
                  <CardContent className="p-6">
                    <span
                      aria-hidden="true"
                      className="absolute -right-3 -top-6 select-none text-[80px] font-black text-foreground/[0.04]"
                    >
                      {i + 1}
                    </span>
                    <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <step.icon className="h-5.5 w-5.5" aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold">{t(step.titleKey)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(step.descKey)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle title={t('landing.featuresTitle')} subtitle={t('landing.featuresSubtitle')} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card key={f.titleKey}>
                  <CardContent className="p-6">
                    <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="font-semibold">{t(f.titleKey)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(f.descKey)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle title={t('landing.howTitle')} subtitle={t('landing.howSubtitle')} />
            <ol className="relative mx-auto max-w-2xl space-y-8 border-l border-border pl-8">
              {STEPS.map((s, i) => (
                <li key={s.titleKey} className="relative">
                  <span className="absolute -left-[41px] flex h-6 w-6 items-center justify-center rounded-full border border-primary/50 bg-primary/15 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{t(s.titleKey)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(s.descKey)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing preview */}
        <section id="pricing" className="border-t border-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <SectionTitle title={t('landing.pricingTitle')} subtitle={t('landing.pricingSubtitle')} />
            <PricingCards />
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="bg-glow-hero rounded-2xl border border-primary/25 px-6 py-12 text-center sm:px-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('landing.ctaTitle')}</h2>
              <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">{t('landing.ctaSubtitle')}</p>
              <Button asChild size="lg" className="mt-7">
                <Link href="/register">
                  {t('landing.ctaButton')}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
