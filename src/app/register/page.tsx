'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/shared/auth-shell';
import { SetupNotice } from '@/components/shared/setup-notice';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { AuthError, registerUser } from '@/lib/auth/client';
import { guessTimezone } from '@/lib/date';
import { getFirestoreDb } from '@/lib/firebase/client';
import type { UserProfile } from '@/types';

export default function RegisterPage() {
  const { t, lang } = useI18n();
  const { firebaseReady } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  if (!firebaseReady) {
    return (
      <AuthShell>
        <SetupNotice />
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !password || !confirm) {
      toast.error(t('auth.errRequired'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('auth.errWeakPassword'));
      return;
    }
    if (password !== confirm) {
      toast.error(t('auth.errPasswordMismatch'));
      return;
    }
    setBusy(true);
    try {
      const user = await registerUser(email.trim(), password, displayName.trim());
      const db = getFirestoreDb();
      if (db) {
        const profile: Omit<UserProfile, 'uid'> & { uid: string } = {
          uid: user.uid,
          // Obligatoire: les regles Firestore exigent ownerId == uid pour la creation.
          ownerId: user.uid,
          email: user.email ?? email.trim(),
          displayName: displayName.trim(),
          language: lang,
          timezone: guessTimezone(),
          availabilityMinutes: 30,
          organization: 'flexible',
          plan: 'free',
          onboardingComplete: false,
          createdAt: Date.now(),
        };
        await setDoc(doc(db, 'users', user.uid), profile);
      }
      toast.success(t('auth.verifyNotice'));
      router.push('/onboarding');
    } catch (error) {
      const key = error instanceof AuthError ? error.i18nKey : 'errGeneric';
      toast.error(t(`auth.${key}`));
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t('auth.registerTitle')}</CardTitle>
          <CardDescription>{t('auth.registerSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('auth.displayName')}</Label>
              <Input
                id="displayName"
                type="text"
                autoComplete="nickname"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                required
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">{t('auth.passMinRule')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('auth.signUp')}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('auth.haveAccount')}{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('auth.signIn').toLowerCase()}
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
