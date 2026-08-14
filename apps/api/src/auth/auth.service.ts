import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import type { LoginInput, RedeemInviteInput, UserRole } from '@campath/shared';
import { TokenService } from './token.service.js';
import { UsersRepository, type AuthUser } from './users.repository.js';
import { InvitesRepository } from './invites.repository.js';

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'invalid_refresh'
  | 'refresh_reused'
  | 'invite_invalid'
  | 'username_taken';

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    readonly status: 401 | 409 | 410,
  ) {
    super(code);
  }
}

export interface PublicUser {
  id: string;
  fullName: string;
  role: UserRole;
  schoolId: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: PublicUser;
}

const toPublicUser = (user: AuthUser): PublicUser => ({
  id: user.id,
  fullName: user.fullName,
  role: user.role,
  schoolId: user.schoolId,
});

/**
 * argon2 throws on a malformed stored hash rather than returning false. A
 * damaged hash must read as "wrong password" — never as a 500 that tells an
 * attacker the account exists.
 */
async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly invites: InvitesRepository,
    private readonly tokens: TokenService,
  ) {}

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.users.findByIdentifier(input.identifier);
    if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
      throw new AuthError('invalid_credentials', 401);
    }

    const session = await this.issueSession(user);
    await this.users.storeRefreshToken({
      userId: user.id,
      rawToken: session.refreshToken,
      expiresAt: session.refreshExpiresAt,
      deviceLabel: input.deviceLabel,
    });
    await this.users.touchLastLogin(user.id);
    return session;
  }

  /**
   * Rotation is mandatory. Presenting a token that has already been spent is
   * treated as theft: every session for that user is revoked and
   * `token_version` is bumped, so the attacker and the victim are both logged
   * out rather than the attacker keeping a working session.
   */
  async refresh(rawToken: string): Promise<AuthSession> {
    const record = await this.users.findRefreshToken(rawToken);
    if (!record || record.expiresAt <= new Date() || !record.user.isActive) {
      throw new AuthError('invalid_refresh', 401);
    }
    if (record.revokedAt) {
      await this.users.revokeAllSessions(record.userId);
      throw new AuthError('refresh_reused', 401);
    }

    const session = await this.issueSession(record.user);
    const rotated = await this.users.rotateRefreshToken({
      recordId: record.id,
      userId: record.userId,
      rawToken: session.refreshToken,
      expiresAt: session.refreshExpiresAt,
    });
    if (!rotated) {
      // Someone else spent this token between our read and our write.
      await this.users.revokeAllSessions(record.userId);
      throw new AuthError('refresh_reused', 401);
    }
    return session;
  }

  async logout(rawToken?: string) {
    if (rawToken) await this.users.revokeRefreshToken(rawToken);
  }

  async redeemInvite(input: RedeemInviteInput): Promise<AuthSession> {
    let user: AuthUser;
    try {
      user = await this.invites.redeem({
        code: input.code,
        fullName: input.fullName,
        username: input.username,
        passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'invite_invalid') {
        throw new AuthError('invite_invalid', 410);
      }
      if (error instanceof Error && error.message === 'username_taken') {
        throw new AuthError('username_taken', 409);
      }
      throw error;
    }

    const session = await this.issueSession(user);
    await this.users.storeRefreshToken({
      userId: user.id,
      rawToken: session.refreshToken,
      expiresAt: session.refreshExpiresAt,
    });
    return session;
  }

  /** Only the fields `updateMeSchema` allows ever reach the database. */
  async updateProfile(
    userId: string,
    patch: { fullName?: string; locale?: 'uz' | 'en' },
  ): Promise<PublicUser> {
    const updated = await this.users.updateProfile(userId, patch);
    return toPublicUser(updated);
  }

  private async issueSession(user: AuthUser): Promise<AuthSession> {
    const refresh = this.tokens.createRefreshToken();
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      role: user.role,
      schoolId: user.schoolId,
      tv: user.tokenVersion,
    });
    return {
      accessToken,
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt,
      user: toPublicUser(user),
    };
  }
}
