import type { Pool } from 'pg';
import type { RequestHandler } from 'express';
import { rateLimit } from './rate-limit.js';

type DurableRateLimitOptions = {
  windowMs: number;
  max: number;
  key: (req: { ip?: string; actor?: { id?: string } }) => string;
};

function isMissingBucketTable(error: unknown) {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && error.code === '42P01'
    && 'message' in error
    && typeof error.message === 'string'
    && error.message.includes('api_rate_limit_buckets'),
  );
}

export function durableRateLimit(pool: Pool, options: DurableRateLimitOptions): RequestHandler {
  // Migration 0193 introduces the durable bucket table. During a staged rollout
  // an older database may briefly serve newer application code, so keep the
  // existing in-process limiter as a bounded compatibility fallback instead of
  // turning every protected request into a generic HTTP 500.
  const localFallback = rateLimit(options);
  let durableTableUnavailable = false;

  return async (req, res, next) => {
    if (durableTableUnavailable) {
      localFallback(req, res, next);
      return;
    }

    try {
      const result = await pool.query(
        `insert into api_rate_limit_buckets(bucket_key,request_count,reset_at)
         values($1,1,now()+($2::bigint * interval '1 millisecond'))
         on conflict(bucket_key) do update set
           request_count=case when api_rate_limit_buckets.reset_at<=now() then 1 else api_rate_limit_buckets.request_count+1 end,
           reset_at=case when api_rate_limit_buckets.reset_at<=now()
             then now()+($2::bigint * interval '1 millisecond') else api_rate_limit_buckets.reset_at end,
           updated_at=now()
         returning request_count,extract(epoch from (reset_at-now()))::int retry_after`,
        [options.key(req), options.windowMs],
      );
      const row = result.rows[0] as { request_count: number; retry_after: number };
      const count = Number(row.request_count);
      const retryAfter = Math.max(1, Number(row.retry_after));
      res.setHeader('RateLimit-Limit', String(options.max));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, options.max - count)));
      if (count > options.max) {
        res.setHeader('Retry-After', String(retryAfter));
        res.status(429).json({ error: { code: 'rate_limited', message: 'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.' } });
        return;
      }
      next();
    } catch (error) {
      if (isMissingBucketTable(error)) {
        durableTableUnavailable = true;
        console.warn('api_rate_limit_buckets is unavailable; using process-local rate limiting until restart.');
        localFallback(req, res, next);
        return;
      }
      next(error);
    }
  };
}
