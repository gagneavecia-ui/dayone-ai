'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AdminError, AdminHeader, AdminLoading, useAdminSection } from '@/components/admin/admin-kit';
import { useI18n } from '@/lib/i18n';

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  plan: string;
  language: string;
  createdAt: number;
}

export default function AdminUsersPage() {
  const { data, loading, reload } = useAdminSection<{ users: AdminUser[] }>('users');
  const { t, lang } = useI18n();
  const locale = lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : 'es-ES';

  return (
    <div className="space-y-6">
      <AdminHeader titleKey="admin.users" subtitleKey="admin.subtitle" />
      {loading ? (
        <AdminLoading />
      ) : data ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.colName')}</TableHead>
                <TableHead>{t('admin.colEmail')}</TableHead>
                <TableHead>{t('admin.colPlan')}</TableHead>
                <TableHead>{t('admin.colJoined')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.displayName || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={u.plan === 'premium' ? 'border-primary/50 text-primary' : ''}>
                      {u.plan === 'premium' ? t('common.premium') : t('common.free')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString(locale) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {data.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t('admin.noData')}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      ) : (
        <AdminError onRetry={reload} />
      )}
    </div>
  );
}
