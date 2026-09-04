import { Router, type Response } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import {
  forgotPasswordSchema, loginSchema, redeemInviteSchema, registerSchema, resetPasswordSchema,
  verifyEmailSchema,
} from '../lib/auth-schemas.js';
import { validateBody } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { AuthError, type AuthService, type AuthSession } from '../services/auth-service.js';
import { rateLimit } from '../middleware/rate-limit.js';

const COOKIE = 'campath_refresh';

function setRefreshCookie(res: Response, session: AuthSession) {
  res.cookie(COOKIE, session.refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: session.refreshExpiresAt,
    path: '/api/v1/auth',
  });
}

const MESSAGES: Record<string, string> = {
  refresh_reused: 'Sessiya xavfsizlik sababli bekor qilindi.',
  invalid_credentials: 'Login yoki parol noto‘g‘ri.',
  invite_invalid: 'Taklif kodi yaroqsiz yoki ishlatilgan.',
  username_taken: 'Bu username band.',
  email_taken: 'Bu email allaqachon ro‘yxatdan o‘tgan.',
  account_pending: 'Hisobingiz tasdiqlanishini kutmoqda. O‘qituvchingiz tasdiqlagach kirishingiz mumkin.',
  account_rejected: 'Ro‘yxatdan o‘tish arizangiz rad etilgan.',
  account_suspended: 'Hisobingiz vaqtincha to‘xtatilgan.',
  reset_invalid: 'Tiklash havolasi yaroqsiz yoki muddati tugagan. Yangisini so‘rang.',
  email_unverified: 'Emailingiz hali tasdiqlanmagan. Pochtangizdagi havolani oching yoki yangisini so‘rang.',
  verification_invalid: 'Tasdiqlash havolasi yaroqsiz yoki muddati tugagan. Yangisini so‘rang.',
  invalid_refresh: 'Refresh token yaroqsiz.',
};

const sendAuthError = (res: Response, error: unknown) => {
  if (error instanceof AuthError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: MESSAGES[error.code] ?? 'Refresh token yaroqsiz.',
        // The approver's own words on a rejection or suspension. Without it the
        // user is locked out with no idea what to fix.
        ...(error.detail ? { detail: error.detail } : {}),
      },
    });
    return;
  }
  throw error;
};

export function createAuthRouter(auth: AuthService) {
  const router = Router();

  router.post('/login', rateLimit({
    windowMs: 15 * 60_000,
    max: 5,
    key: req => `login:${req.ip}:${String(req.body?.identifier).toLowerCase()}`,
    refundOnServerError: true,
  }), validateBody(loginSchema), async (req, res) => {
    try {
      const session = await auth.login(req.body);
      setRefreshCookie(res, session);
      res.json({ accessToken: session.accessToken, user: session.user });
    } catch (error) {
      sendAuthError(res, error);
    }
  });

  router.post('/refresh', async (req, res) => {
    try {
      const rawToken = req.cookies?.[COOKIE];
      if (!rawToken) throw new AuthError('invalid_refresh', 401);
      const session = await auth.refresh(rawToken);
      setRefreshCookie(res, session);
      res.json({ accessToken: session.accessToken, user: session.user });
    } catch (error) {
      res.clearCookie(COOKIE, { path: '/api/v1/auth' });
      sendAuthError(res, error);
    }
  });

  router.post('/redeem-invite', rateLimit({windowMs:60*60_000,max:10}), validateBody(redeemInviteSchema), async (req,res) => {
    try {
      const session=await auth.redeemInvite(req.body);setRefreshCookie(res,session);
      res.status(201).json({accessToken:session.accessToken,user:session.user});
    } catch(error) { sendAuthError(res,error); }
  });

  /**
   * Open registration. Returns 202, not 201 with a session: the account exists
   * but is not usable yet, and answering with a token would be a lie.
   *
   * Rate limited per IP because it is the one unauthenticated endpoint that
   * writes a row.
   */
  router.post('/register',
    rateLimit({ windowMs: 60 * 60_000, max: 10, key: (req) => `register:${req.ip}` }),
    validateBody(registerSchema), async (req, res) => {
      try {
        const user = await auth.register(req.body);
        res.status(202).json({ user });
      } catch (error) { sendAuthError(res, error); }
    });

  router.post('/password/forgot',
    rateLimit({ windowMs: 60 * 60_000, max: 5, key: (req) => `forgot:${req.ip}:${String(req.body?.email).toLowerCase()}` }),
    validateBody(forgotPasswordSchema), async (req, res) => {
      try {
        const result = await auth.forgotPassword(req.body.email);
        res.json(result);
      } catch (error) { sendAuthError(res, error); }
    });

  router.post('/password/reset',
    rateLimit({ windowMs: 60 * 60_000, max: 10, key: (req) => `reset:${req.ip}` }),
    validateBody(resetPasswordSchema), async (req, res) => {
      try {
        const result = await auth.resetPassword(req.body.token, req.body.password);
        res.json(result);
      } catch (error) { sendAuthError(res, error); }
    });

  router.post('/email/verify',
    rateLimit({ windowMs: 60 * 60_000, max: 20, key: (req) => `verify:${req.ip}` }),
    validateBody(verifyEmailSchema), async (req, res) => {
      try {
        const result = await auth.verifyEmail(req.body.token);
        res.json(result);
      } catch (error) { sendAuthError(res, error); }
    });

  router.post('/email/resend',
    rateLimit({ windowMs: 60 * 60_000, max: 5, key: (req) => `verify-resend:${req.ip}` }),
    requireAuth, async (req, res) => {
      try {
        const result = await auth.resendVerification(req.user!.id);
        res.json(result);
      } catch (error) { sendAuthError(res, error); }
    });

  router.post('/logout', async (req, res) => {
    try {
      const rawToken = req.cookies?.[COOKIE];
      if (rawToken) await auth.logout(rawToken);
      res.clearCookie(COOKIE, { path: '/api/v1/auth' });
      res.status(204).end();
    } catch (error) { sendAuthError(res, error); }
  });

  router.get('/me', requireAuth, async (req, res) => {
    try {
      const user = await auth.me(req.user!.id);
      res.json({ user });
    } catch (error) { sendAuthError(res, error); }
  });

  const inviteSchema = z.object({
    role: z.enum(['student', 'teacher', 'school_admin', 'platform_admin']),
    classId: z.string().uuid().optional(),
    expiresInDays: z.number().int().min(1).max(30).optional(),
  });

  router.post('/invites', requireAuth, validateBody(inviteSchema), async (req, res) => {
    try {
      const invite = await auth.createInvite(req.user!, req.body);
      res.status(201).json(invite);
    } catch (error) { sendAuthError(res, error); }
  });

  return router;
}
