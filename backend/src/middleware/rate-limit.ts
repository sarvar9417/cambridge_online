import type { RequestHandler } from 'express';

interface Entry { count: number; resetAt: number }
const buckets = new Map<string, Entry>();

export function rateLimit(options: {
  windowMs: number;
  max: number;
  key?: (req: any) => string;
  /** Server faults are not client abuse and should not consume a login attempt. */
  refundOnServerError?: boolean;
}): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const key = options.key?.(req) ?? req.ip ?? 'unknown';
    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, entry);
    }

    entry.count++;
    const chargedEntry = entry;
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, options.max - entry.count)));

    if (entry.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: { code: 'rate_limited', message: 'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.' } });
      return;
    }

    if (options.refundOnServerError) {
      res.once('finish', () => {
        if (res.statusCode < 500) return;
        const current = buckets.get(key);
        if (current === chargedEntry) current.count = Math.max(0, current.count - 1);
      });
    }

    next();
  };
}

export function clearRateLimits() { buckets.clear(); }
