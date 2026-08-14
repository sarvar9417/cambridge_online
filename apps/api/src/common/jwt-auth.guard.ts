import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Actor } from '@campath/shared';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { TokenService } from '../auth/token.service.js';
import { UsersRepository } from '../auth/users.repository.js';

declare module 'express' {
  interface Request {
    actor?: Actor;
  }
}

/**
 * Global guard, registered via `APP_GUARD`. R1: default is DENY — a route is
 * only reachable without a token if it carries `@Public()`.
 *
 * The token's `tv` claim is compared against `users.token_version`, so a
 * password change or a lockout invalidates every issued access token
 * immediately rather than after the 15-minute expiry.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('unauthorized');

    let payload;
    try {
      payload = await this.tokens.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('invalid_token');
    }

    const user = await this.users.findActiveById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) throw new UnauthorizedException('invalid_token');

    request.actor = {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
      fullName: user.fullName,
    };
    return true;
  }
}
