import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { loginSchema, redeemInviteSchema, updateMeSchema } from '@campath/shared';
import { Public } from '../common/public.decorator.js';
import { ZodBody } from '../common/zod.pipe.js';
import { LoginRateLimitGuard } from '../common/rate-limit.guard.js';
import { AuthError, AuthService, type AuthSession } from './auth.service.js';

export const REFRESH_COOKIE = 'campath_refresh';
const COOKIE_PATH = '/api/v1/auth';

/** Uzbek messages for the codes the client may surface to a user (R10). */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Login yoki parol noto‘g‘ri.',
  invalid_refresh: 'Sessiya muddati tugagan.',
  refresh_reused: 'Sessiya xavfsizlik sababli bekor qilindi.',
  invite_invalid: 'Taklif kodi yaroqsiz yoki ishlatilgan.',
  username_taken: 'Bu username band.',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(LoginRateLimitGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(ZodBody(loginSchema)) body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(res, () => this.auth.login(body as never));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) {
      res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
      throw toHttp(new AuthError('invalid_refresh', 401));
    }
    try {
      return await this.respond(res, () => this.auth.refresh(raw));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
      throw error;
    }
  }

  @Public()
  @Post('redeem-invite')
  @HttpCode(201)
  async redeemInvite(
    @Body(ZodBody(redeemInviteSchema)) body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(res, () => this.auth.redeemInvite(body as never));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
  }

  /** Guarded by the global JwtAuthGuard; `actor` is set or the request never arrives. */
  @Get('me')
  me(@Req() req: Request) {
    return { user: req.actor };
  }

  /**
   * Self-service profile update. `updateMeSchema` is `.strict()` and declares
   * neither `role` nor `schoolId`, so a privilege-escalation attempt is a 400
   * from the schema rather than something the handler has to remember to strip.
   */
  @Patch('me')
  async updateMe(@Req() req: Request, @Body(ZodBody(updateMeSchema)) body: unknown) {
    const updated = await this.auth.updateProfile(req.actor!.id, body as never);
    return { user: updated };
  }

  private async respond(res: Response, run: () => Promise<AuthSession>) {
    let session: AuthSession;
    try {
      session = await run();
    } catch (error) {
      if (error instanceof AuthError) throw toHttp(error);
      throw error;
    }

    // httpOnly so XSS cannot read it; SameSite=Strict so a third-party page
    // cannot trigger a refresh; Path scoped so it is not sent to every route.
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: session.refreshExpiresAt,
      path: COOKIE_PATH,
    });
    return { accessToken: session.accessToken, user: session.user };
  }
}

const toHttp = (error: AuthError) =>
  new HttpException(
    { error: { code: error.code, message: MESSAGES[error.code] ?? error.code } },
    error.status,
  );
