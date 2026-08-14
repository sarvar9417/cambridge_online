import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import type { UserRole } from '@campath/shared';
import { ApiConfig } from '../config.js';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_DAYS = 30;

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  schoolId: string | null;
  /** `users.token_version` — bumping it invalidates every issued access token. */
  tv: number;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: Uint8Array;

  constructor(config: ApiConfig) {
    this.accessSecret = new TextEncoder().encode(config.jwtSecret);
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({ role: payload.role, schoolId: payload.schoolId, tv: payload.tv })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(this.accessSecret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.accessSecret);
    if (typeof payload.sub !== 'string' || typeof payload.tv !== 'number') {
      throw new Error('malformed_token');
    }
    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      schoolId: (payload.schoolId as string | null) ?? null,
      tv: payload.tv,
    };
  }

  /**
   * Refresh tokens are opaque random strings, not JWTs: they must be revocable,
   * and only their sha256 is ever stored.
   */
  createRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
    const raw = randomBytes(48).toString('base64url');
    return {
      raw,
      hash: hashRefreshToken(raw),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    };
  }
}

export const hashRefreshToken = (raw: string) => createHash('sha256').update(raw).digest('hex');
