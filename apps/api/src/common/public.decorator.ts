import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'campath:isPublic';

/**
 * Opts a route out of the global `JwtAuthGuard`.
 *
 * R1: the default is DENY. Only these five routes may carry it, and
 * `route-coverage.spec.ts` fails the build if any other route does:
 * `/auth/login`, `/auth/refresh`, `/auth/redeem-invite`, `/health`, `/ready`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
