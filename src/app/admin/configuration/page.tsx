'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminHeader, AdminLoading, useAdminSection } from '@/components/admin/admin-kit';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/client-api';
import type { SystemQuotas } from '@/types';

const FIELDS: { name: keyof SystemQuotas; labelKey: string }[] = [
  { name: 'coachFree', labelKey: 'admin.coachFree' },
  { name: 'coachPremium', labelKey: 'admin.coachPremium' },
  { name: 'missionsFree', labelKey: 'admin.aiCallsFree' },
  { name: 'missionsPremium', labelKey: 'admin.aiCallsPremium' },
  { name: 'goalsFree', labelKey: 'admin.goalsFree' },
  { name: 'goalsPremium', labelKey: 'admin.goalsPremium' },
  { name: 'historyFree', labelKey: 'admin.historyFree' },
  { name: 'historyPremium', labelKey: 'admin.historyPremium' },
];

export default function AdminConfigurationPage() {
  const { data, loading, reload } = useAdminSection<{ config: { quotas: SystemQuotas } | null }>('config');
  const [quotas, setQuotas] = useState<SystemQuotas | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (data?.config?.quotas) setQuotas(data.config.quotas);
  }, [data]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!quotas) return;
    setBusy(true);
    try {
      await apiFetch('/api/admin/config', {
        method: 'POST',
        body: JSON.stringify({ quotas }),
      });
      toast.success(t('admin.configSaved'));
      await reload();
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'invalid_quotas') toast.error(t('errors.generic'));
      else toast.error((error as { message?: string }).message || t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader titleKey="admin.configuration" subtitleKey="admin.subtitle" />
      {loading ? (
        <AdminLoading />
      ) : quotas ? (
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm text-muted-foreground">{t('admin.configDesc')}</p>
            <form onSubmit={onSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <div key={f.name} className="space-y-2">
                    <Label htmlFor={`q-${f.name}`}>{t(f.labelKey)}</Label>
                    <Input
                      id={`q-${f.name}`}
                      type="number"
                      min={f.name.startsWith('goals') ? 1 : 0}
                      max={1000}
                      value={quotas[f.name]}
                      onChange={(e) => setQuotas({ ...quotas, [f.name]: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('common.save')}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">{t('admin.noData')}</p>
      )}
    </div>
  );
}
