'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Logo } from '@/components/shared/logo';
import { SetupNotice } from '@/components/shared/setup-notice';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { guessTimezone, isValidTimezone } from '@/lib/date';
import { createGoal, saveUserProfile } from '@/lib/db/services';
import type { Language } from '@/types';
import { cn } from '@/lib/utils';

const SUGGESTION_KEYS = ['onboarding.s1', 'onboarding.s2', 'onboarding.s3', 'onboarding.s4', 'onboarding.s5', 'onboarding.s6'];
const MAX_GOALS_ONBOARDING = 3;

const TIMEZONE_OPTIONS = [
  'Africa/Niamey', 'Africa/Lagos', 'Africa/Abidjan', 'Africa/Casablanca', 'Africa/Nairobi', 'Africa/Johannesburg', 'Africa/Cairo',
  'Europe/Paris', 'Europe/London', 'Europe/Madrid', 'Europe/Berlin', 'Europe/Rome', 'Europe/Lisbon', 'Europe/Brussels', 'Europe/Zurich',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Bogota', 'America/Toronto',
  'Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Singapore',
  'Australia/Sydney', 'UTC',
];

const LANGS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];

export default function OnboardingPage() {
  const { t, lang, setLang } = useI18n();
  const { user, loading, firebaseReady, profile, profileLoaded } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [timezone, setTimezone] = useState('UTC');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [availability, setAvailability] = useState(30);
  const [organization, setOrganization] = useState<'morning' | 'evening' | 'flexible'>('flexible');
  const [busy, setBusy] = useState(false);

  // Adjust form defaults once the user context resolves (render-time sync).
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  if (user && initializedFor !== user.uid) {
    setInitializedFor(user.uid);
    setDisplayName(user.displayName || '');
    setTimezone(guessTimezone());
    setLanguage(lang);
  }

  useEffect(() => {
    if (loading) return;
    if (!firebaseReady) return;
    if (!user) {
      router.replace('/login?next=%2Fonboarding');
      return;
    }
    if (profileLoaded && profile?.onboardingComplete) {
      router.replace('/dashboard');
      return;
    }
  }, [loading, firebaseReady, user, profile, profileLoaded, router]);

  const timezoneList = useMemo(() => {
    const extra =
      typeof Intl !== 'undefined' &&
      'supportedValuesOf' in Intl &&
      typeof (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf === 'function'
        ? (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('timeZone')
        : [];
    return Array.from(new Set([...TIMEZONE_OPTIONS, ...extra]));
  }, []);

  if (!loading && !firebaseReady) {
    return (
      <div className="bg-glow-hero flex min-h-screen items-center justify-center px-4">
        <SetupNotice />
      </div>
    );
  }
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  function addCustomGoal() {
    const title = customGoal.trim();
    if (!title) return;
    if (selectedGoals.length >= MAX_GOALS_ONBOARDING) {
      toast.info(t('onboarding.maxGoalsHint'));
      return;
    }
    setSelectedGoals((prev) => [...prev, title]);
    setCustomGoal('');
  }

  function removeGoal(title: string) {
    setSelectedGoals((prev) => prev.filter((g) => g !== title));
  }

  async function finish() {
    if (!user) return;
    if (selectedGoals.length === 0) {
      toast.error(t('onboarding.goalsLabel'));
      return;
    }
    if (!displayName.trim()) {
      toast.error(t('auth.errRequired'));
      return;
    }
    if (!isValidTimezone(timezone)) {
      setTimezone(guessTimezone());
    }
    setBusy(true);
    try {
      await saveUserProfile(user.uid, {
        uid: user.uid,
        email: user.email ?? '',
        displayName: displayName.trim(),
        language,
        timezone: isValidTimezone(timezone) ? timezone : guessTimezone(),
        availabilityMinutes: availability,
        organization,
        plan: profile?.plan ?? 'free',
        onboardingComplete: true,
      });
      for (const title of selectedGoals) {
        await createGoal(user.uid, { title, description: '', deadline: null, steps: [] });
      }
      router.push('/dashboard');
    } catch {
      toast.error(t('errors.generic'));
      setBusy(false);
    }
  }

  return (
    <div className="bg-glow-hero flex min-h-screen flex-col items-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Logo size="md" />
        <span className="font-bold">
          DAYONE<span className="text-primary"> AI</span>
        </span>
      </div>

      <div className="w-full max-w-md">
        <Progress value={(step / 4) * 100} className="mb-6" aria-label={`Step ${step}/4`} />

        <Card>
          <CardContent className="p-6">
            {step === 1 ? (
              <div className="space-y-5">
                <header>
                  <h1 className="text-lg font-semibold">{t('onboarding.step1Title')}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.step1Sub')}</p>
                </header>
                <div className="space-y-2">
                  <Label htmlFor="ob-name">{t('onboarding.displayNameLabel')}</Label>
                  <Input
                    id="ob-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={80}
                    placeholder="Alex"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('onboarding.languageLabel')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGS.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => {
                          setLanguage(l.value);
                          setLang(l.value);
                        }}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm transition-colors',
                          language === l.value
                            ? 'border-primary bg-primary/12 font-medium text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-tz">{t('onboarding.timezoneLabel')}</Label>
                  <input
                    id="ob-tz"
                    list="ob-tz-options"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="border-input bg-background/50 flex h-10 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  <datalist id="ob-tz-options">
                    {timezoneList.slice(0, 120).map((tz) => (
                      <option key={tz} value={tz} />
                    ))}
                  </datalist>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <header>
                  <h1 className="text-lg font-semibold">{t('onboarding.step2Title')}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.step2Sub')}</p>
                </header>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('onboarding.goalsHint')}</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTION_KEYS.map((key) => {
                    const label = t(key);
                    const selected = selectedGoals.includes(label);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setSelectedGoals((prev) =>
                            selected ? prev.filter((g) => g !== label) : prev.length >= MAX_GOALS_ONBOARDING ? prev : [...prev, label],
                          )
                        }
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs transition-colors',
                          selected
                            ? 'border-primary bg-primary/12 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                        )}
                      >
                        {selectedGoals.length >= MAX_GOALS_ONBOARDING && !selected ? '…' : label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder={t('onboarding.customGoalPh')}
                    maxLength={120}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomGoal();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addCustomGoal} aria-label={t('onboarding.addGoal')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ul className="space-y-2">
                  {selectedGoals.map((g) => (
                    <li key={g} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
                      <span className="truncate">{g}</span>
                      <button
                        type="button"
                        onClick={() => removeGoal(g)}
                        aria-label={`${t('common.delete')} ${g}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">{t('onboarding.maxGoalsHint')}</p>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <header>
                  <h1 className="text-lg font-semibold">{t('onboarding.step3Title')}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.step3Sub')}</p>
                </header>
                <div className="space-y-2">
                  <Label>{t('onboarding.availabilityLabel')}</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { v: 15, key: 'onboarding.avail15' },
                      { v: 30, key: 'onboarding.avail30' },
                      { v: 60, key: 'onboarding.avail60' },
                      { v: 90, key: 'onboarding.avail90' },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setAvailability(opt.v)}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm transition-colors',
                          availability === opt.v
                            ? 'border-primary bg-primary/12 font-medium text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t(opt.key)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('onboarding.orgLabel')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: 'morning', key: 'onboarding.orgMorning' },
                      { v: 'evening', key: 'onboarding.orgEvening' },
                      { v: 'flexible', key: 'onboarding.orgFlexible' },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setOrganization(opt.v as 'morning' | 'evening' | 'flexible')}
                        className={cn(
                          'rounded-lg border px-3 py-2.5 text-sm transition-colors',
                          organization === opt.v
                            ? 'border-primary bg-primary/12 font-medium text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t(opt.key)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15">
                  <ArrowRight className="h-7 w-7 text-success" aria-hidden="true" />
                </div>
                <h1 className="text-lg font-semibold">{t('onboarding.step4Title')}</h1>
                <p className="text-sm text-muted-foreground">{t('onboarding.step4Sub')}</p>
                <ul className="mx-auto max-w-xs space-y-1.5 text-left text-sm">
                  {selectedGoals.map((g) => (
                    <li key={g} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                      <span className="truncate">{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mt-5 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || busy}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('common.back')}
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 2 && selectedGoals.length === 0}>
              {t('common.next')}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={busy || selectedGoals.length === 0}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('onboarding.startCta')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
