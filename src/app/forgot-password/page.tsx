'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/shared/auth-shell';
import { useI18n } from '@/lib/i18n';
import { resetPassword } from '@/lib/auth/client';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t('auth.errRequired'));
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      // Same message either way: never disclose whether an account exists.
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t('auth.resetTitle')}</CardTitle>
          <CardDescription>{t('auth.resetSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-foreground">
              {t('auth.resetSent')}
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('auth.sendReset')}
              </Button>
            </form>
          )}
          <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-primary">
            {t('auth.backToLogin')}
          </Link>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
