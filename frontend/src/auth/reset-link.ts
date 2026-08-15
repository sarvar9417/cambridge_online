/**
 * Reads the reset token out of whatever URL the email link produced.
 *
 * The backend builds `${FRONTEND_URL}/reset-password?token=…`, which arrives as
 * a query string. But the app routes on the hash, and a deployment that rewrites
 * unknown paths to the SPA entry may hand it over as `#/reset-password?token=…`
 * instead. Both have to work: a link that silently does nothing is worse than no
 * link, because the user has no way to tell it failed.
 */
export function readResetToken(location: { search?: string; hash?: string }): string | null {
  const fromQuery = new URLSearchParams(location.search ?? '').get('token');
  if (fromQuery) return fromQuery;

  const hash = location.hash ?? '';
  const queryStart = hash.indexOf('?');
  if (queryStart === -1) return null;
  return new URLSearchParams(hash.slice(queryStart + 1)).get('token') || null;
}
