'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/client-api';
import { AdminNav } from '@/components/admin/admin-nav';

export function useAdminSection<T>(section: string, deps: unknown[] = []) {
  const { firebaseReady } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  const load = useCallback(async () => {
    if (!firebaseReady) return;
    setLoading(true);
    try {
      const result = await apiFetch<T>(`/api/admin/overview?section=${section}`);
      setData(result);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'forbidden') toast.error(t('admin.notAdmin'));
      else if (code === 'firebase_not_configured') toast.warning(t('errors.firebaseMissing'));
      else toast.error((error as { message?: string }).message || t('errors.generic'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [section, firebaseReady, t]);

  useEffect(() => {
    void load();
  }, [load, ...deps]);

  return { data, loading, reload: load };
}

export function AdminHeader({ titleKey, subtitleKey }: { titleKey: string; subtitleKey: string }) {
  const { t } = useI18n();
  return (
    <header className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t(titleKey)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(subtitleKey)}</p>
      </div>
      <AdminNav />
    </header>
  );
}

export function AdminLoading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

export function AdminError({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{t('admin.noData')}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        {t('common.retry')}
      </Button>
    </div>
  );
}
