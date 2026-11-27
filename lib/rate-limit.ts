/**
 * Tiny in-memory rate limiter (per isolate). Enough to blunt casual abuse.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(args: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(args.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(args.key, { count: 1, resetAt: now + args.windowMs });
    return { ok: true };
  }
  if (existing.count >= args.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}
