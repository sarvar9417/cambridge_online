import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { jwtVerify, SignJWT } from 'jose';
import { config } from '../config.js';
import type {
  ForgotPasswordInput, LoginInput, RedeemInviteInput, RegisterInput, ResetPasswordInput, UpdateProfileInput,
} from '../lib/auth-schemas.js';
import type { Mailer } from '../lib/email/mailer.js';
import { ConsoleMailer } from '../lib/email/mailer.js';
import type { AuthRepository, AuthUser } from '../repositories/auth-repository.js';

const accessSecret = new TextEncoder().encode(config.JWT_SECRET);
const REFRESH_DAYS = 30;

export type AuthErrorCode =
  | 'invalid_credentials' | 'invalid_refresh' | 'refresh_reused' | 'invite_invalid' | 'username_taken'
  | 'email_taken' | 'account_pending' | 'account_rejected' | 'account_suspended' | 'reset_invalid';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    public readonly status: 401 | 403 | 409 | 410,
    /** Extra detail the route may pass through, e.g. why an account was rejected. */
    public readonly detail?: string,
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

const statusError = (status: AuthUser['status'], reason: string | null) =>
  status === 'pending' ? new AuthError('account_pending', 403)
    : status === 'rejected' ? new AuthError('account_rejected', 403, reason ?? undefined)
      : new AuthError('account_suspended', 403, reason ?? undefined);

const RESET_TTL_MINUTES = 60;
const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly mailer: Mailer = new ConsoleMailer(),
    private readonly frontendUrl: string = config.FRONTEND_URL,
  ) {}

  /**
   * Open registration. The account exists immediately but cannot sign in: it is
   * created `pending` and an owner decides its role and class. No session is
   * returned, because there is nothing yet to hold a session for.
   */
  async register(input: RegisterInput) {
    try {
      return await this.repository.register({
        fullName: input.fullName,
        email: input.email,
        username: input.username,
        passwordHash: await argon2.hash(input.password),
        note: input.note,
      });
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
        // Which of the two is taken matters: the applicant can fix a username
        // themselves, but a duplicate email usually means they already applied.
        const constraint = String((error as { constraint?: string }).constraint ?? '');
        throw constraint.includes('email')
          ? new AuthError('email_taken', 409)
          : new AuthError('username_taken', 409);
      }
      throw error;
    }
  }

  /**
   * Always reports the same thing to the caller, whether or not the address is
   * registered -- the response must not be a way to test which emails exist.
   * The return value tells the *server* whether a message went out, so the page
   * can offer the ask-your-teacher path when no provider is configured.
   */
  async requestPasswordReset(input: ForgotPasswordInput): Promise<{ emailConfigured: boolean }> {
    const user = await this.repository.findByEmail(input.email);
    // A pending or rejected account has no password worth resetting yet.
    if (user && user.status === 'active') {
      const token = randomBytes(32).toString('base64url');
      await this.repository.createResetToken({
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
      });
      const link = `${this.frontendUrl}/reset-password?token=${token}`;
      await this.mailer.send({
        to: input.email,
        subject: 'CamPath — parolni tiklash',
        text: [
          `Assalomu alaykum, ${user.fullName}.`,
          '',
          'CamPath hisobingiz parolini tiklash so‘raldi. Quyidagi havola orqali yangi parol o‘rnating:',
          link,
          '',
          `Havola ${RESET_TTL_MINUTES} daqiqa amal qiladi va bir marta ishlaydi.`,
          'Agar bu so‘rovni siz yubormagan bo‘lsangiz, bu xatni e’tiborsiz qoldiring — parolingiz o‘zgarmaydi.',
        ].join('\n'),
      });
    }
    return { emailConfigured: this.mailer.configured };
  }

  async resetPassword(input: ResetPasswordInput) {
    const result = await this.repository.consumeResetToken(
      hashResetToken(input.token),
      await argon2.hash(input.password),
    );
    // Expired, already used, or never existed -- all indistinguishable to the
    // caller on purpose.
    if (!result) throw new AuthError('reset_invalid', 410);
    return result;
  }

  /**
   * A teacher hands this code to a student whose email never arrived. It is the
   * same one-shot token the email carries, just delivered by hand, so it expires
   * and invalidates on the same terms.
   */
  async issueResetToken(userId: string, issuedBy: string) {
    const token = randomBytes(32).toString('base64url');
    await this.repository.createResetToken({
      userId,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
      issuedBy,
    });
    return { token, link: `${this.frontendUrl}/reset-password?token=${token}`, expiresInMinutes: RESET_TTL_MINUTES };
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.repository.findByIdentifier(input.identifier);
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new AuthError('invalid_credentials', 401);
    }
    // Only after the password checks out. Saying "awaiting approval" to anyone
    // who types an email would confirm which addresses have accounts.
    if (user.status !== 'active') throw statusError(user.status, user.statusReason);

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
