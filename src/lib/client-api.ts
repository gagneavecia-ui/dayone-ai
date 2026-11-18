import { currentToken } from '@/lib/auth/client';

export interface ApiError extends Error {
  code?: string;
  status?: number;
}

/** Fetch wrapper that attaches the Firebase ID token to every API call. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await currentToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const error = new Error((data.message as string) || (data.error as string) || 'Request failed') as ApiError;
    error.code = data.error as string;
    error.status = res.status;
    throw error;
  }
  return data as T;
}
