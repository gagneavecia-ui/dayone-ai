'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminError, AdminHeader, AdminLoading, useAdminSection } from '@/components/admin/admin-kit';
import { useI18n } from '@/lib/i18n';
import type { AuditLog } from '@/types';

export default function AdminAuditLogsPage() {
  const { data, loading, reload } = useAdminSection<{ logs: AuditLog[] }>('audit');
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <AdminHeader titleKey="admin.auditLogs" subtitleKey="admin.subtitle" />
      {loading ? (
        <AdminLoading />
      ) : data ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.colDate')}</TableHead>
                <TableHead>{t('admin.colActor')}</TableHead>
                <TableHead>{t('admin.colAction')}</TableHead>
                <TableHead>{t('admin.colDetails')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                  </TableCell>
                  <TableCell>{log.actorEmail || log.actorId}</TableCell>
                  <TableCell>
                    <span className="rounded-md bg-secondary px-2 py-1 font-mono text-xs">{log.action}</span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground" title={log.meta}>
                    {log.target} {log.meta ? `· ${log.meta}` : ''}
                  </TableCell>
                </TableRow>
              ))}
              {data.logs.length === 0 ? (
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
