'use client';

import Link from 'next/link';
import { Check, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { PLAN_LIMITS } from '@/lib/plans';
import { cn } from '@/lib/utils';

interface PricingCardsProps {
  currentPlan?: 'free' | 'premium' | null;
  className?: string;
}

/** Shared Free/Premium comparison used on /pricing and the landing preview. */
export function PricingCards({ currentPlan = null, className }: PricingCardsProps) {
  const { t, lang } = useI18n();
  const nf = lang === 'en' ? (n: number) => n : lang === 'fr' ? (n: number) => n : (n: number) => n;

  const rows = [
    {
      key: t('pricing.featGoals'),
      free: nf(PLAN_LIMITS.free.activeGoals),
      premium: nf(PLAN_LIMITS.premium.activeGoals),
    },
    {
      key: t('pricing.featMissions'),
      free: 3,
      premium: 3,
    },
    {
      key: t('pricing.featCoach'),
      free: nf(PLAN_LIMITS.free.coachMessagesPerDay),
      premium: nf(PLAN_LIMITS.premium.coachMessagesPerDay),
    },
    {
      key: t('pricing.featHistory'),
      free: `${PLAN_LIMITS.free.historyDays} ${t('common.days')}`,
      premium: `${PLAN_LIMITS.premium.historyDays} ${t('common.days')}`,
    },
    {
      key: t('pricing.featAnalytics'),
      free: '–',
      premium: '✓',
    },
    {
      key: t('pricing.featSupport'),
      free: t('pricing.supportBasic'),
      premium: t('pricing.supportPriority'),
    },
  ];

  return (
    <div className={cn('grid gap-5 md:grid-cols-2 md:items-stretch', className)}>
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('pricing.freeName')}</h3>
            {currentPlan === 'free' ? (
              <Badge variant="secondary">{t('pricing.currentPlan')}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{t('pricing.freeDesc')}</p>
          <p className="pt-2 text-3xl font-bold">
            0€ <span className="text-sm font-normal text-muted-foreground">{t('pricing.perMonth')}</span>
          </p>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                {row.key}
              </span>
              <span className="font-medium">{row.free}</span>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/register">{t('pricing.ctaFree')}</Link>
          </Button>
        </CardFooter>
      </Card>

      <Card className="relative flex flex-col border-primary/50 shadow-[0_0_40px_rgba(139,92,246,0.12)]">
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 bg-primary text-primary-foreground">
          <Crown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {t('pricing.mostPopular')}
        </Badge>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('pricing.premiumName')}</h3>
            {currentPlan === 'premium' ? (
              <Badge className="border-0 bg-primary text-primary-foreground">{t('pricing.currentPlan')}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{t('pricing.premiumDesc')}</p>
          <p className="pt-2 text-3xl font-bold">
            7€ <span className="text-sm font-normal text-muted-foreground">{t('pricing.perMonth')}</span>
          </p>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                {row.key}
              </span>
              <span className="font-medium">{row.premium}</span>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/register">{t('pricing.ctaPremium')}</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t('pricing.soon')}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
