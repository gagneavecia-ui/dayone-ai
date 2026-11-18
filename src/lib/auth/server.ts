import 'server-only';
import { getAdminAuth, isFirebaseAdminConfigured } from '@/lib/firebase/admin';
import type { Role } from '@/types';

export interface AuthContext {
  uid: string;
  email: string;
  role: Role;
  token: string;
}

export type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; status: number; code: string; message?: string };

/**
 * Verifies a Firebase ID token from the `Authorization: Bearer <token>`
 * header against the Admin SDK, checking revocation. Never trust a token
 * sent in a body, a query string or a cookie alone.
 */
export async function getAuthContext(req: Request): Promise<AuthResult> {
  if (!isFirebaseAdminConfigured()) {
    return {
      ok: false,
      status: 503,
      code: 'firebase_not_configured',
      message: 'Firebase Admin credentials are not set on this deployment.',
    };
  }
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return { ok: false, status: 401, code: 'missing_token', message: 'Authorization header required.' };
  }
  try {
    const decoded = await getAdminAuth()!.verifyIdToken(token, true);
    const rawRole = decoded.role;
    const role: Role = rawRole === 'admin' || rawRole === 'super_admin' ? rawRole : 'user';
    return { ok: true, ctx: { uid: decoded.uid, email: decoded.email ?? '', role, token } };
  } catch {
    return { ok: false, status: 401, code: 'invalid_token', message: 'Invalid or expired session token.' };
  }
}

export async function requireAdmin(req: Request): Promise<AuthResult> {
  const result = await getAuthContext(req);
  if (!result.ok) return result;
  if (result.ctx.role !== 'admin' && result.ctx.role !== 'super_admin') {
    return { ok: false, status: 403, code: 'forbidden', message: 'Administrator privileges required.' };
  }
  return result;
}

export function jsonError(status: number, code: string, message?: string): Response {
  return Response.json({ error: code, ...(message ? { message } : {}) }, { status });
}
