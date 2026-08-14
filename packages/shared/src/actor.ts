import type { UserRole } from './enums.js';

/**
 * Who is making a request. R1: every repository method takes one of these and
 * scopes its SQL by it — a repository method without an `actor` parameter is a
 * bug, not a shortcut.
 */
export interface Actor {
  id: string;
  role: UserRole;
  schoolId: string | null;
  fullName: string;
}

/**
 * Used only by worker jobs, which run outside any request. It must never be
 * reachable from an HTTP route: a system actor bypasses every ownership check.
 */
export const SYSTEM_ACTOR: Actor = Object.freeze({
  id: '00000000-0000-0000-0000-000000000000',
  role: 'owner',
  schoolId: null,
  fullName: 'system',
});

export const isSystemActor = (actor: Actor) => actor.id === SYSTEM_ACTOR.id;
