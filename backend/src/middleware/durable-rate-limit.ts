import type { Pool } from 'pg';
import type { RequestHandler } from 'express';

type DurableRateLimitOptions = {
  windowMs: number;
  max: number;
  key: (req: { ip?: string; actor?: { id?: string } }) => string;
};

export function durableRateLimit(pool: Pool, options: DurableRateLimitOptions): RequestHandler {
  return async (req, res, next) => {
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
  };
}