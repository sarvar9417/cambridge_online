import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { jwtVerify, SignJWT } from 'jose';
import { config } from '../config.js';
import type { LoginInput, RedeemInviteInput, UpdateProfileInput } from '../lib/auth-schemas.js';
import type { AuthRepository, AuthUser } from '../repositories/auth-repository.js';

const accessSecret = new TextEncoder().encode(config.JWT_SECRET);
const REFRESH_DAYS = 30;

export class AuthError extends Error {
  constructor(
    public readonly code: 'invalid_credentials' | 'invalid_refresh' | 'refresh_reused' | 'invite_invalid' | 'username_taken',
    public readonly status: 401 | 410,
  ) {
    super(code);
  }
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: ReturnType<typeof publicUser>;
}

const publicUser = (user: AuthUser) => ({
  id: user.id,
  schoolId: user.schoolId,
  role: user.role,
  fullName: user.fullName,
});

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.repository.findByIdentifier(input.identifier);
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new AuthError('invalid_credentials', 401);
    }

    const session = await this.createSession(user);
    await this.repository.storeRefreshToken(
      user.id,
      session.refreshToken,
      session.refreshExpiresAt,
      input.deviceLabel,
    );
    await this.repository.updateLastLogin(user.id);
    return session;
  }

  async refresh(rawToken: string): Promise<AuthSession> {
    const record = await this.repository.findRefreshToken(rawToken);
    if (!record || record.expiresAt <= new Date() || !record.user.isActive) {
      throw new AuthError('invalid_refresh', 401);
    }
    if (record.revokedAt) {
      await this.repository.revokeAllSessions(record.userId);
      throw new AuthError('refresh_reused', 410);
    }

    const session = await this.createSession(record.user);
    try {
      await this.repository.rotateRefreshToken(
        record.id,
        record.userId,
        session.refreshToken,
        session.refreshExpiresAt,
      );
    } catch {
      await this.repository.revokeAllSessions(record.userId);
      throw new AuthError('refresh_reused', 410);
    }
    return session;
  }

  async logout(rawToken?: string) {
    if (rawToken) await this.repository.revokeRefreshToken(rawToken);
  }

  async redeemInvite(input: RedeemInviteInput) {
    try {
      const user = await this.repository.redeemInvite({ ...input, passwordHash: await argon2.hash(input.password) });
      const session = await this.createSession(user);
      await this.repository.storeRefreshToken(user.id, session.refreshToken, session.refreshExpiresAt);
      return session;
    } catch (error) {
      if (error instanceof Error && error.message === 'invite_invalid') throw new AuthError('invite_invalid', 410);
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') throw new AuthError('username_taken', 410);
      throw error;
    }
  }
  async changePassword(userId:string,currentPassword:string,newPassword:string){const user=await this.repository.findById(userId);if(!user||!(await argon2.verify(user.passwordHash,currentPassword)))throw new AuthError('invalid_credentials',401);await this.repository.changePassword(userId,await argon2.hash(newPassword))}
  async updateProfile(userId:string,input:UpdateProfileInput){return publicUser(await this.repository.updateProfile(userId,input))}

  async verifyAccessToken(token: string) {
    const { payload } = await jwtVerify(token, accessSecret);
    if (typeof payload.sub !== 'string' || typeof payload.tv !== 'number') throw new Error('Invalid token');
    const user = await this.repository.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) throw new Error('Revoked token');
    return publicUser(user);
  }

  private async createSession(user: AuthUser): Promise<AuthSession> {
    const accessToken = await new SignJWT({
      role: user.role,
      schoolId: user.schoolId,
      tv: user.tokenVersion,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(accessSecret);
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
    return { accessToken, refreshToken, refreshExpiresAt, user: publicUser(user) };
  }
}
