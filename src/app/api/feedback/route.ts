import { z } from 'zod';
import { getAuthContext, jsonError } from '@/lib/auth/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getAdminDb } from '@/lib/firebase/admin';

const BodySchema = z.object({
  category: z.enum(['bug', 'idea', 'other']),
  message: z.string().trim().min(5).max(2000),
});

export async function POST(req: Request) {
  if (!rateLimit(`feedback:${clientIp(req)}`, 5, 300_000)) {
    return jsonError(429, 'rate_limited');
  }
  const auth = await getAuthContext(req);
  if (!auth.ok) return jsonError(auth.status, auth.code, auth.message);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return jsonError(400, 'invalid_body');
  }

  const db = getAdminDb();
  if (!db) return jsonError(503, 'firebase_not_configured');

  await db.collection('feedbacks').add({
    ownerId: auth.ctx.uid,
    category: body.category,
    message: body.message,
    createdAt: Date.now(),
  });
  return Response.json({ ok: true });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
