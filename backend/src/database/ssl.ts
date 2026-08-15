export type DatabaseSslMode = 'auto' | 'disable' | 'require' | 'verify-full';

export interface DatabaseSslInput {
  mode?: DatabaseSslMode;
  caPem?: string;
  caBase64?: string;
}

export const isLocalDatabase = (connectionString: string) =>
  /@(localhost|127\.0\.0\.1|postgres|host\.docker\.internal)[:/]/.test(connectionString);

/**
 * `auto` is the rollout-safe default for remote databases:
 * - if a CA is configured, verify the certificate and hostname;
 * - otherwise keep encrypted TLS compatibility (`require`) until the CA is
 *   installed in the deployment environment.
 *
 * `verify-full` remains fail-closed: selecting it explicitly without a CA is an
 * error. `require` is encrypted but does not authenticate the server identity.
 */
export function databaseSslOptions(connectionString: string, input: DatabaseSslInput = {}) {
  if (isLocalDatabase(connectionString)) return undefined;
  const mode = input.mode ?? 'auto';
  if (mode === 'disable') return undefined;
  const ca = input.caPem?.trim() || decodeCa(input.caBase64);
  if (mode === 'require') return { rejectUnauthorized: false } as const;
  if (mode === 'auto' && !ca) return { rejectUnauthorized: false } as const;
  if (!ca) throw new Error('DB_SSL_CA or DB_SSL_CA_BASE64 is required when DB_SSL_MODE=verify-full');
  return { rejectUnauthorized: true, ca } as const;
}

export function databaseSslUsesVerifiedIdentity(connectionString: string, input: DatabaseSslInput = {}) {
  const options = databaseSslOptions(connectionString, input);
  return Boolean(options && options.rejectUnauthorized === true);
}

function decodeCa(value?: string) {
  if (!value?.trim()) return undefined;
  let decoded: string;
  try { decoded = Buffer.from(value.trim(), 'base64').toString('utf8'); }
  catch { throw new Error('DB_SSL_CA_BASE64 is not valid base64'); }
  if (!decoded.includes('-----BEGIN CERTIFICATE-----')) throw new Error('DB_SSL_CA_BASE64 does not contain a PEM certificate');
  return decoded;
}
