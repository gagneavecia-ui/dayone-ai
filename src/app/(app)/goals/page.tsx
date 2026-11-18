'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Archive, ArchiveRestore, Loader2, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n, useDateFormatter } from '@/lib/i18n';
import { PLAN_LIMITS } from '@/lib/plans';
import {
  createGoal,
  deleteGoal,
  setGoalStatus,
  subscribeGoals,
  toggleGoalStep,
  updateGoal,
} from '@/lib/db/services';
import { newStep } from '@/lib/utils-goal';
import type { Goal, GoalStep } from '@/types';

interface GoalFormState {
  id: string | null;
  title: string;
  description: string;
  deadline: string;
  steps: GoalStep[];
}

const EMPTY_FORM: GoalFormState = { id: null, title: '', description: '', deadline: '', steps: [] };

export default function GoalsPage() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { formatDate } = useDateFormatter();

  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<GoalFormState>(EMPTY_FORM);
  const [stepInput, setStepInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);

  const activeLimit = profile?.plan === 'premium' ? PLAN_LIMITS.premium.activeGoals : PLAN_LIMITS.free.activeGoals;
  const activeCount = useMemo(() => goals?.filter((g) => g.status === 'active').length ?? 0, [goals]);
  const limitReached = activeCount >= activeLimit;

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeGoals(profile.uid, tab, setGoals);
    return () => unsub();
  }, [profile, tab]);

  function openCreate() {
    if (limitReached) {
      toast.warning(t('goals.limitReached'), { description: t('goals.limitReachedSub') });
      return;
    }
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(goal: Goal) {
    setForm({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '',
      steps: goal.steps,
    });
    setDialogOpen(true);
  }

  function addStep() {
    const title = stepInput.trim();
    if (!title) return;
    setForm((f) => ({ ...f, steps: [...f.steps, newStep(title)] }));
    setStepInput('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim()) {
      toast.error(t('auth.errRequired'));
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        deadline: form.deadline ? new Date(`${form.deadline}T12:00:00Z`).getTime() : null,
        steps: form.steps,
      };
      if (form.id) await updateGoal(form.id, payload);
      else await createGoal(profile.uid, payload);
      toast.success(form.id ? t('common.update') : t('common.create'));
      setDialogOpen(false);
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  async function onToggleStep(goal: Goal, stepId: string) {
    try {
      await toggleGoalStep(goal.id, goal, stepId);
    } catch {
      toast.error(t('errors.generic'));
    }
  }

  async function onArchive(goal: Goal) {
    try {
      await setGoalStatus(goal.id, goal.status === 'active' ? 'archived' : 'active');
    } catch {
      toast.error(t('errors.generic'));
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    try {
      await deleteGoal(deleteTarget.id);
      toast.success(t('common.delete'));
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('goals.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('goals.subtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('goals.newGoal')}
        </Button>
      </header>

      <div className="flex items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'archived')}>
          <TabsList>
            <TabsTrigger value="active">{t('common.active')}</TabsTrigger>
            <TabsTrigger value="archived">{t('common.archived')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {activeCount}/{activeLimit}
        </Badge>
      </div>

      {goals === null ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Target className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">{t('goals.emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('goals.emptySub')}</p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('goals.newGoal')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => (
            <li key={goal.id}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-semibold">{goal.title}</h2>
                        {goal.status === 'archived' ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            {t('common.archived')}
                          </Badge>
                        ) : null}
                      </div>
                      {goal.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
                      ) : null}
                      {goal.deadline ? (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {t('goals.deadlineLabel')}: {formatDate(goal.deadline)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(goal)} aria-label={t('common.edit')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onArchive(goal)}
                        aria-label={goal.status === 'active' ? t('goals.archive') : t('goals.unarchive')}
                      >
                        {goal.status === 'active' ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(goal)}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={goal.progress} className="flex-1" />
                    <span className="text-sm font-medium text-primary">{goal.progress}%</span>
                  </div>

                  {goal.steps.length > 0 ? (
                    <ul className="mt-4 space-y-1.5">
                      {goal.steps.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => onToggleStep(goal, s.id)}
                            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary/50"
                            disabled={goal.status === 'archived'}
                          >
                            <span
                              aria-hidden="true"
                              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border ${
                                s.done ? 'border-success bg-success/20 text-success' : 'border-border'
                              }`}
                            >
                              {s.done ? <span className="h-2 w-2 rounded-full bg-current" /> : null}
                            </span>
                            <span className={s.done ? 'text-muted-foreground line-through' : ''}>{s.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? t('goals.editGoal') : t('goals.newGoal')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="goal-title">{t('goals.titleLabel')}</Label>
              <Input
                id="goal-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('goals.titlePh')}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-desc">
                {t('goals.descLabel')} <span className="text-muted-foreground">({t('common.optional')})</span>
              </Label>
              <Textarea
                id="goal-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t('goals.descPh')}
                rows={3}
                maxLength={1000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">
                {t('goals.deadlineLabel')} <span className="text-muted-foreground">({t('common.optional')})</span>
              </Label>
              <Input
                id="goal-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('goals.stepsLabel')}</Label>
              <div className="flex gap-2">
                <Input
                  value={stepInput}
                  onChange={(e) => setStepInput(e.target.value)}
                  placeholder={t('goals.stepPh')}
                  maxLength={120}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addStep();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addStep} aria-label={t('goals.addStep')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-1.5">
                {form.steps.map((s, i) => (
                  <li key={s.id} className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm">
                    <span className="truncate">
                      {i + 1}. {s.title}
                    </span>
                    <button
                      type="button"
                      aria-label={t('common.delete')}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((x) => x.id !== s.id) }))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {form.id ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('goals.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-white hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
