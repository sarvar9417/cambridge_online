import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@campath/shared';

export const ROLES_KEY = 'campath:roles';

/**
 * Restricts a route to the listed roles. R2: this is the only thing that may
 * produce a 403 — everything else answers 404 so an attacker cannot probe for
 * the existence of a resource.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
