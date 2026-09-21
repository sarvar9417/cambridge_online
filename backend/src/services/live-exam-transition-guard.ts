import { DomainError } from './assignments-service.js';

/**
 * Optimistic concurrency guard for teacher-controlled Live Challenge state
 * transitions.
 *
 * The caller must invoke this only after the session row has been locked with
 * `FOR UPDATE`. Keeping the comparison next to the locked row makes a stale
 * browser tab fail closed instead of overwriting a newer classroom state.
 *
 * `expectedVersion` is optional during the compatibility window so existing
 * clients keep working while the frontend is migrated. New teacher controls
 * should always send the authoritative snapshot version.
 */
export function assertExpectedLiveExamVersion(
  session: { version?: unknown },
  expectedVersion?: number,
) {
  if (expectedVersion === undefined) return;

  const actualVersion = Number(session.version);
  if (!Number.isSafeInteger(actualVersion) || actualVersion < 0) {
    throw new DomainError('live_state_conflict', 409);
  }
  if (actualVersion !== expectedVersion) {
    throw new DomainError('live_state_conflict', 409);
  }
}
