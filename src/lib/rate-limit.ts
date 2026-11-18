/**
 * Lightweight in-memory sliding-window rate limiter. It protects a single
 * server instance; on serverless it is best-effort and complements the
 * persistent per-user quotas stored in Firestore (which are the real
 * enforcement layer).
 */
const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  buckets.set(key, timestamps);
  if (buckets.size > MAX_BUCKETS) {
    // Drop the oldest half of the keys to bound memory usage.
    const keys = Array.from(buckets.keys()).slice(0, MAX_BUCKETS / 2);
    for (const k of keys) buckets.delete(k);
  }
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
