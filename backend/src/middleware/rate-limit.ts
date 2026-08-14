import type { RequestHandler } from 'express';
interface Entry {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Entry>();
export function rateLimit(options: {
  windowMs: number;
  max: number;
  key?: (req: any) => string;
}): RequestHandler {
  return (req, res, next) => {
    const now = Date.now(),
      key = options.key?.(req) ?? req.ip ?? 'unknown';
    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, entry);
    }
    entry.count++;
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, options.max - entry.count)));
    if (entry.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({
        error: { code: 'rate_limited', message: 'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.' },
      });
      return;
    }
    next();
  };
}
export function clearRateLimits() {
  buckets.clear();
}
