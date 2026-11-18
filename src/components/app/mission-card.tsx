'use client';

import { Circle, CircleCheck, Clock, PauseCircle, PlayCircle, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import type { Mission, MissionStatus } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<MissionStatus, string> = {
  todo: 'border-border text-muted-foreground',
  in_progress: 'border-primary/50 text-primary',
  done: 'border-success/50 text-success',
  postponed: 'border-amber-500/50 text-amber-400',
};

const PRIORITY_STYLES: Record<Mission['priority'], string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-primary/12 text-primary border-primary/30',
  low: 'bg-secondary text-muted-foreground border-border',
};

interface MissionCardProps {
  mission: Mission;
  compact?: boolean;
  onStatusChange?: (status: MissionStatus) => void;
}

export function MissionCard({ mission, compact = false, onStatusChange }: MissionCardProps) {
  const { t } = useI18n();

  const statusLabel = t(`missions.${mission.status === 'in_progress' ? 'inProgress' : mission.status}`);
  const actions: { status: MissionStatus; label: string; icon: typeof PlayCircle; variant: 'default' | 'outline' | 'ghost' }[] = [
    { status: 'in_progress', label: t('missions.start'), icon: PlayCircle, variant: 'outline' },
    { status: 'done', label: t('missions.markDone'), icon: CircleCheck, variant: 'default' },
    { status: 'postponed', label: t('missions.postpone'), icon: PauseCircle, variant: 'ghost' },
  ];

  return (
    <Card className={cn('transition-colors', mission.status === 'done' && 'opacity-75')}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('text-[11px]', STATUS_STYLES[mission.status])}>
                {statusLabel}
              </Badge>
              <Badge variant="outline" className={cn('text-[11px]', PRIORITY_STYLES[mission.priority])}>
                {t(`missions.${mission.priority}`)}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {mission.durationMin} {t('common.min')}
              </span>
            </div>
            <h3 className={cn('mt-2 font-medium leading-snug', mission.status === 'done' && 'line-through opacity-70')}>
              {mission.title}
            </h3>
          </div>
          {mission.status === 'done' ? (
            <CircleCheck className="h-6 w-6 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <Circle className="h-6 w-6 shrink-0 text-muted-foreground/40" aria-hidden="true" />
          )}
        </div>

        {!compact ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('missions.instructions')}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{mission.instructions}</p>
            {mission.goalTitle ? (
              <p className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {mission.goalTitle}
              </p>
            ) : null}
          </div>
        ) : mission.goalTitle ? (
          <p className="mt-1.5 truncate text-xs text-muted-foreground">{mission.goalTitle}</p>
        ) : null}

        {onStatusChange && mission.status !== 'done' ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button
                key={a.status}
                size="sm"
                variant={a.variant}
                className={cn(a.variant === 'default' && 'bg-success text-success-foreground hover:bg-success/90')}
                onClick={() => onStatusChange(a.status)}
              >
                <a.icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {a.label}
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
