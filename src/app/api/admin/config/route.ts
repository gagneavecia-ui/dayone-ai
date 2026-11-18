import { z } from 'zod';
import { requireAdmin, jsonError } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { SystemConfigSchema } from '@/lib/ai/quotas';
import type { AuditLog } from '@/types';

const BodySchema = SystemConfigSchema;

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return jsonError(auth.status, auth.code, auth.message);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return jsonError(400, 'invalid_quotas');
  }

  const db = getAdminDb();
  if (!db) return jsonError(503, 'firebase_not_configured');

  await db
    .collection('systemConfig')
    .doc('quotas')
    .set({ quotas: body.quotas, updatedAt: Date.now(), updatedBy: auth.ctx.uid });

  const log: Omit<AuditLog, 'id'> = {
    actorId: auth.ctx.uid,
    actorEmail: auth.ctx.email,
    action: 'config.update',
    target: 'systemConfig/quotas',
    meta: JSON.stringify(body.quotas),
    createdAt: Date.now(),
  };
  await db.collection('auditLogs').add(log);

  return Response.json({ ok: true });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
