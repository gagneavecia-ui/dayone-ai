'use client';

import { TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';

/**
 * Honest notice shown when the Firebase backend has not been configured on
 * the deployment yet. Never fakes functionality that cannot work.
 */
export function SetupNotice() {
  const { t } = useI18n();
  const steps = ['auth.setupStep1', 'auth.setupStep2', 'auth.setupStep3'];

  return (
    <Card className="mx-auto w-full max-w-lg border-amber-500/30">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2 text-amber-400">
          <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          <CardTitle className="text-lg">{t('auth.setupTitle')}</CardTitle>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('auth.setupSubtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-2.5">
          {steps.map((key, i) => (
            <li key={key} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="text-foreground/90">{t(key)}</span>
            </li>
          ))}
        </ol>
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {t('auth.setupHint')}
        </p>
      </CardContent>
    </Card>
  );
}
