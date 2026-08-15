/**
 * Recognises "the database could not be reached" as distinct from "the request
 * was wrong".
 *
 * These arrive as ordinary Errors from the pg driver, so without this they fall
 * through to the generic handler and a student staring at a dead pooler is told
 * "Ichki xato yuz berdi" -- which says the platform is broken when in fact it is
 * waiting on something outside itself, and gives no hint that trying again in a
 * minute is the right move.
 *
 * Matching is on the driver's error codes where it has them and on its messages
 * where it does not: a pool timeout carries no code at all, only the text below.
 */
const CONNECTION_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPIPE',
  // PostgreSQL class 08 -- connection exception -- plus the shutdown and
  // too-many-clients cases, which are the same thing from the caller's side.
  '08000', '08003', '08006', '08001', '08004', '08007', '08P01',
  '57P01', '57P02', '57P03', '53300',
]);

const CONNECTION_MESSAGES = [
  'connection terminated',
  'connection ended unexpectedly',
  'timeout exceeded when trying to connect',
  'terminating connection',
  'server closed the connection unexpectedly',
  'client has encountered a connection error',
  'the database system is starting up',
  'too many clients',
];

/**
 * `depth` bounds the walk down `cause`. Real driver errors nest once or twice,
 * but an error whose cause points back at itself would recurse until the stack
 * blows -- and this runs inside the handler that is supposed to keep a failure
 * readable, so it must not become the failure.
 */
export function isDatabaseUnavailable(error: unknown, depth = 5): boolean {
  if (!error || typeof error !== 'object' || depth <= 0) return false;

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && CONNECTION_CODES.has(code)) return true;

  const message = String((error as { message?: unknown }).message ?? '').toLowerCase();
  if (CONNECTION_MESSAGES.some((needle) => message.includes(needle))) return true;

  // pg wraps the socket failure and puts the useful part in `cause`, so a
  // timeout reports "Connection terminated due to connection timeout" with
  // "Connection terminated unexpectedly" underneath.
  return isDatabaseUnavailable((error as { cause?: unknown }).cause, depth - 1);
}
