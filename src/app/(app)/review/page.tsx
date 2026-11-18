'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, NotebookPen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { localDateFor } from '@/lib/date';
import { fetchReview, saveReviewBase } from '@/lib/db/services';
import { apiFetch } from '@/lib/client-api';
import type { DailyReview } from '@/types';

interface Insights {
  summary: string;
  adjustments: string[];
  focus: string;
}

export default function ReviewPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const timezone = profile?.timezone || 'UTC';

  const [date, setDate] = useState(() => localDateFor('UTC'));
  const [existing, setExisting] = useState<DailyReview | null | undefined>(undefined);
  const [accomplished, setAccomplished] = useState('');
  const [difficult, setDifficult] = useState('');
  const [improve, setImprove] = useState('');
  const [comment, setComment] = useState('');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDate(localDateFor(timezone));
  }, [timezone]);

  useEffect(() => {
    if (!profile) return;
    fetchReview(profile.uid, date)
      .then((review) => {
        setExisting(review);
        if (review) {
          setAccomplished(review.accomplished);
          setDifficult(review.difficult);
          setImprove(review.improve);
          setComment(review.comment);
          if (review.aiSummary && review.aiAdjustments) {
            setInsights({ summary: review.aiSummary, adjustments: review.aiAdjustments, focus: review.aiFocus ?? '' });
          }
        }
      })
      .catch(() => setExisting(null));
  }, [profile, date]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!accomplished.trim()) {
      toast.error(t('auth.errRequired'));
      return;
    }
    setBusy(true);
    try {
      // Persist the review first (also guards against duplicate submissions).
      await saveReviewBase(profile.uid, date, {
        accomplished: accomplished.trim(),
        difficult: difficult.trim(),
        improve: improve.trim(),
        comment: comment.trim(),
      });
      const data = await apiFetch<{ insights: Insights }>('/api/ai/review', {
        method: 'POST',
        body: JSON.stringify({
          accomplished: accomplished.trim(),
          difficult: difficult.trim(),
          improve: improve.trim(),
          comment: comment.trim(),
        }),
      });
      setInsights(data.insights);
      setExisting(await fetchReview(profile.uid, date));
      toast.success(t('review.alreadyDone'));
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'quota_reached') toast.warning(t('errors.quota'));
      else if (code === 'review_exists') {
        toast.info(t('review.alreadyDone'));
        const review = await fetchReview(profile.uid, date);
        if (review?.aiSummary && review.aiAdjustments) {
          setInsights({ summary: review.aiSummary, adjustments: review.aiAdjustments, focus: review.aiFocus ?? '' });
        }
      } else if (code === 'ai_not_configured' || code === 'firebase_not_configured') toast.warning(t('errors.firebaseMissing'));
      else toast.error(t('errors.aiUnavailable'));
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return null;

  const alreadyReviewed = existing ? Boolean(existing.aiSummary) : false;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <NotebookPen className="h-6 w-6 text-primary" aria-hidden="true" />
          {t('review.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('review.subtitle')} · {date}
        </p>
      </header>

      {existing === undefined ? (
        <Skeleton className="h-72 w-full" />
      ) : alreadyReviewed ? (
        <>
          <Card className="border-success/30">
            <CardContent className="flex items-center gap-3 p-5">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden="true" />
              <div>
                <p className="font-medium">{t('review.alreadyDone')}</p>
                <p className="text-sm text-muted-foreground">{t('review.editDisabled')}</p>
              </div>
            </CardContent>
          </Card>
          {insights ? <InsightsCard insights={insights} /> : null}
        </>
      ) : (
        <>
          <Card>
            <CardContent className="p-5">
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="rev-accomplished">{t('review.accomplished')}</Label>
                  <Textarea
                    id="rev-accomplished"
                    value={accomplished}
                    onChange={(e) => setAccomplished(e.target.value)}
                    placeholder={t('review.accomplishedPh')}
                    rows={3}
                    maxLength={2000}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rev-difficult">{t('review.difficult')}</Label>
                  <Textarea
                    id="rev-difficult"
                    value={difficult}
                    onChange={(e) => setDifficult(e.target.value)}
                    placeholder={t('review.difficultPh')}
                    rows={2}
                    maxLength={2000}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rev-improve">{t('review.improve')}</Label>
                  <Textarea
                    id="rev-improve"
                    value={improve}
                    onChange={(e) => setImprove(e.target.value)}
                    placeholder={t('review.improvePh')}
                    rows={2}
                    maxLength={2000}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rev-comment">
                    {t('review.comment')} <span className="text-muted-foreground">({t('common.optional')})</span>
                  </Label>
                  <Input
                    id="rev-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('review.commentPh')}
                    maxLength={2000}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {busy ? t('review.submitting') : t('review.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {busy ? (
            <Card>
              <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                {t('review.aiThinking')}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {!busy && insights ? <InsightsCard insights={insights} /> : null}
    </div>
  );
}

function InsightsCard({ insights }: { insights: Insights }) {
  const { t } = useI18n();
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5">
        <h2 className="font-semibold">{t('review.aiInsights')}</h2>
        <div className="mt-3 space-y-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('review.aiSummary')}</p>
            <p className="mt-1 leading-relaxed">{insights.summary}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('review.adjustments')}</p>
            <ul className="mt-1.5 space-y-1.5">
              {insights.adjustments.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </div>
          {insights.focus ? (
            <div className="rounded-lg border border-primary/25 bg-primary/10 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{t('review.focusTomorrow')}</p>
              <p className="mt-1 font-medium">{insights.focus}</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
