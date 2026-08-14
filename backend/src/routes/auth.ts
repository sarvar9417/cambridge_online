import { Router, type Response } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { loginSchema, redeemInviteSchema } from '../lib/auth-schemas.js';
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

const sendAuthError = (res: Response, error: unknown) => {
  if (error instanceof AuthError) {
    const message = error.code === 'refresh_reused'
      ? 'Sessiya xavfsizlik sababli bekor qilindi.'
      : error.code === 'invalid_credentials'
        ? 'Login yoki parol noto‘g‘ri.'
        : error.code === 'invite_invalid' ? 'Taklif kodi yaroqsiz yoki ishlatilgan.'
        : error.code === 'username_taken' ? 'Bu username band.' : 'Refresh token yaroqsiz.';
    res.status(error.status).json({ error: { code: error.code, message } });
    return;
  }
  throw error;
};

export function createAuthRouter(auth: AuthService) {
  const router = Router();

  router.post('/login', rateLimit({windowMs:15*60_000,max:5,key:req=>`login:${req.ip}:${String(req.body?.identifier).toLowerCase()}`}), validateBody(loginSchema), async (req, res) => {
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

  router.post('/logout', requireAuth(auth), async (req, res) => {
    await auth.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { path: '/api/v1/auth' });
    res.status(204).end();
  });
  router.post('/change-password',requireAuth(auth),async(req,res)=>{try{const body=z.object({currentPassword:z.string().min(8),newPassword:z.string().min(8).max(200)}).parse(req.body);await auth.changePassword(req.actor!.id,body.currentPassword,body.newPassword);res.clearCookie(COOKIE,{path:'/api/v1/auth'});res.status(204).end()}catch(error){sendAuthError(res,error)}});

  return router;
}
