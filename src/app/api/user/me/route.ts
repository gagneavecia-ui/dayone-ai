import { z } from 'zod';
import { getAuthContext, jsonError } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getServerProfile, peekQuota } from '@/lib/ai/quotas';
import { localDateFor } from '@/lib/date';
import { resolveLimits } from '@/lib/plans';
import { isValidTimezone } from '@/lib/date';
import type { Language, UserProfile } from '@/types';

const UpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  language: z.enum(['en', 'fr', 'es']).optional(),
  timezone: z.string().trim().max(100).optional(),
  availabilityMinutes: z.number().int().min(10).max(600).optional(),
  organization: z.enum(['morning', 'evening', 'flexible']).optional(),
});

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.ok) return jsonError(auth.status, auth.code, auth.message);
  const profile = await getServerProfile(auth.ctx.uid);
  if (!profile) return jsonError(404, 'profile_not_found');
  const date = localDateFor(profile.timezone);
  const plan = profile.plan === 'premium' ? 'premium' : 'free';
  const coach = await peekQuota(auth.ctx.uid, 'coach', profile.timezone, plan);
  const ai = await peekQuota(auth.ctx.uid, 'aiCall', profile.timezone, plan);
  return Response.json({ profile, usage: { date, coach, ai } });
}

export async function PUT(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.ok) return jsonError(auth.status, auth.code, auth.message);

  let body: z.infer<typeof UpdateSchema>;
  try {
    body = UpdateSchema.parse(await req.json());
  } catch {
    return jsonError(400, 'invalid_body');
  }
  if (body.timezone && !isValidTimezone(body.timezone)) {
    return jsonError(400, 'invalid_timezone');
  }

  const db = getAdminDb();
  if (!db) return jsonError(503, 'firebase_not_configured');

  const patch: Partial<UserProfile> = {};
  if (body.displayName !== undefined) patch.displayName = body.displayName;
  if (body.language !== undefined) patch.language = body.language as Language;
  if (body.timezone !== undefined) patch.timezone = body.timezone;
  if (body.availabilityMinutes !== undefined) patch.availabilityMinutes = body.availabilityMinutes;
  if (body.organization !== undefined) patch.organization = body.organization;

  if (Object.keys(patch).length === 0) return jsonError(400, 'empty_update');

  await db.collection('users').doc(auth.ctx.uid).set(patch, { merge: true });
  const limits = resolveLimits((await getServerProfile(auth.ctx.uid))?.plan === 'premium' ? 'premium' : 'free', null);
  return Response.json({ ok: true, limits });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
