import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-process fixed-window limiter.
 *
 * Keyed on IP **and** identifier: keying on IP alone would let one attacker lock
 * out a whole school behind a NAT, and keying on identifier alone would let a
 * botnet spread a password spray across addresses.
 *
 * In-process is deliberate for a single API instance; a second instance needs
 * this moved to Redis, which is already a dependency.
 */
export class FixedWindowLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  /** Returns the seconds to wait when the caller is over the limit. */
  hit(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > this.max) {
      return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  reset() {
    this.buckets.clear();
  }
}

export const LOGIN_LIMITER = new FixedWindowLimiter(15 * 60_000, 5);

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const identifier = String(
      (request.body as { identifier?: unknown } | undefined)?.identifier ?? '',
    ).toLowerCase();
    const result = LOGIN_LIMITER.hit(`${request.ip ?? 'unknown'}:${identifier}`);

    if (!result.allowed) {
      throw new HttpException(
        {
          error: {
            code: 'rate_limited',
            message: 'Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.',
          },
        },
        429,
      );
    }
    return true;
  }
}
