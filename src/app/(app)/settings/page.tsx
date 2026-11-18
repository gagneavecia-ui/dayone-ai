'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  Download,
  Loader2,
  LogOut,
  Save,
  Send,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { guessTimezone, isValidTimezone, localDateFor } from '@/lib/date';
import { deleteAllUserData, fetchUsage, saveUserProfile } from '@/lib/db/services';
import { deleteAuthUser, logoutUser } from '@/lib/auth/client';
import { apiFetch } from '@/lib/client-api';
import { PLAN_LIMITS } from '@/lib/plans';
import { useInstallPwa } from '@/components/pwa/use-install';
import type { Language } from '@/types';

const TIMEZONE_OPTIONS = [
  'Africa/Niamey', 'Africa/Lagos', 'Africa/Abidjan', 'Africa/Casablanca', 'Africa/Nairobi', 'Africa/Johannesburg', 'Africa/Cairo',
  'Europe/Paris', 'Europe/London', 'Europe/Madrid', 'Europe/Berlin', 'Europe/Rome', 'Europe/Lisbon', 'Europe/Brussels', 'Europe/Zurich',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Bogota',
  'Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Singapore',
  'Australia/Sydney', 'UTC',
];

const LANGS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { profile } = useAuth();
  const router = useRouter();
  const { canInstall, installed, install } = useInstallPwa();

  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [timezone, setTimezone] = useState('UTC');
  const [availability, setAvailability] = useState(30);
  const [organization, setOrganization] = useState<'morning' | 'evening' | 'flexible'>('flexible');
  const [usage, setUsage] = useState<{ coachMessages: number; aiCalls: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'idea' | 'other'>('other');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setLanguage(profile.language);
    setTimezone(profile.timezone || guessTimezone());
    setAvailability(profile.availabilityMinutes || 30);
    setOrganization(profile.organization || 'flexible');
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    fetchUsage(profile.uid, localDateFor(profile.timezone || 'UTC'))
      .then(setUsage)
      .catch(() => undefined);
  }, [profile]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!displayName.trim()) {
      toast.error(t('auth.errRequired'));
      return;
    }
    const tz = isValidTimezone(timezone) ? timezone : guessTimezone();
    setBusy(true);
    try {
      await saveUserProfile(profile.uid, {
        displayName: displayName.trim(),
        language,
        timezone: tz,
        availabilityMinutes: availability,
        organization,
      });
      setLang(language);
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  async function sendFeedback() {
    if (!profile) return;
    if (feedbackMessage.trim().length < 5) {
      toast.error(t('auth.errRequired'));
      return;
    }
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ category: feedbackCategory, message: feedbackMessage.trim() }),
      });
      setFeedbackMessage('');
      toast.success(t('settings.feedbackSent'));
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'firebase_not_configured') toast.warning(t('errors.firebaseMissing'));
      else toast.error(t('errors.generic'));
    }
  }

  async function onDeleteAccount() {
    if (!profile) return;
    if (deleteConfirm !== 'DELETE') {
      toast.error(t('settings.deleteConfirmLabel'));
      return;
    }
    setBusy(true);
    try {
      await deleteAllUserData(profile.uid);
      await deleteAuthUser();
      toast.success(t('settings.deleted'));
      router.push('/');
    } catch (error) {
      const code = (error as { code?: string }).code ?? '';
      if (code === 'auth/requires-recent-login') {
        toast.error(t('errors.sessionExpired'));
      } else if (code === 'firebase_not_configured') {
        toast.warning(t('errors.firebaseMissing'));
      } else {
        toast.error(t('errors.generic'));
      }
      setBusy(false);
    }
  }

  async function onSignOut() {
    await logoutUser();
    router.push('/');
  }

  if (!profile) return null;

  const isPremium = profile.plan === 'premium';
  const limits = isPremium ? PLAN_LIMITS.premium : PLAN_LIMITS.free;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </header>

      {/* Profile */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <UserRound className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
            {t('settings.profileSection')}
          </h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="st-name">{t('settings.displayNameLabel')}</Label>
              <Input
                id="st-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="st-lang">{t('settings.languageLabel')}</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                  <SelectTrigger id="st-lang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-tz">{t('settings.timezoneLabel')}</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="st-tz">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {[...new Set([...TIMEZONE_OPTIONS, profile.timezone || '', guessTimezone()])]
                      .filter(Boolean)
                      .map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('onboarding.availabilityLabel')}</Label>
                <Select value={String(availability)} onValueChange={(v) => setAvailability(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 30, 60, 90].map((v) => (
                      <SelectItem key={v} value={String(v)}>
                        {v} {t('common.min')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('onboarding.orgLabel')}</Label>
                <Select value={organization} onValueChange={(v) => setOrganization(v as 'morning' | 'evening' | 'flexible')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{t('onboarding.orgMorning')}</SelectItem>
                    <SelectItem value="evening">{t('onboarding.orgEvening')}</SelectItem>
                    <SelectItem value="flexible">{t('onboarding.orgFlexible')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Plan & usage */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Badge variant="outline" className="border-primary/40 text-primary">
              {isPremium ? t('common.premium') : t('common.free')}
            </Badge>
            {t('settings.planSection')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('settings.usageToday')}</p>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <dt className="text-xs text-muted-foreground">{t('settings.coachUsage')}</dt>
              <dd className="mt-1 font-semibold">
                {usage?.coachMessages ?? '–'}<span className="text-xs font-normal text-muted-foreground">/{limits.coachMessagesPerDay}</span>
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <dt className="text-xs text-muted-foreground">{t('settings.missionsUsage')}</dt>
              <dd className="mt-1 font-semibold">
                {usage?.aiCalls ?? '–'}<span className="text-xs font-normal text-muted-foreground">/{limits.aiCallsPerDay}</span>
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <dt className="text-xs text-muted-foreground">{t('settings.goalsUsage')}</dt>
              <dd className="mt-1 font-semibold">
                <span className="text-xs font-normal text-muted-foreground">≤ </span>{limits.activeGoals}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* PWA */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Download className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
            {t('settings.pwaSection')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('settings.installHint')}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={!canInstall || installed}
            onClick={() => install()}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {installed ? <Check className="mr-1 h-4 w-4" /> : null}
            {installed ? t('settings.installed') : t('settings.installApp')}
          </Button>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">{t('settings.feedbackSection')}</h2>
          <div className="space-y-3">
            <Select value={feedbackCategory} onValueChange={(v) => setFeedbackCategory(v as 'bug' | 'idea' | 'other')}>
              <SelectTrigger aria-label={t('settings.feedbackLabel')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="idea">Idea</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder={t('settings.feedbackPh')}
              maxLength={2000}
            />
            <Button variant="outline" size="sm" onClick={sendFeedback}>
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('settings.sendFeedback')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="border-destructive/30">
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">{t('settings.accountSection')}</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('nav.signOut')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('settings.deleteTitle')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete account dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
              {t('settings.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('settings.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm('')}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteAccount}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteConfirm !== 'DELETE' || busy}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
