export type DatabaseSslMode = 'disable' | 'require' | 'verify-full';

export interface DatabaseSslInput {
  mode?: DatabaseSslMode;
  caPem?: string;
  caBase64?: string;
}

export const isLocalDatabase = (connectionString: string) =>
  /@(localhost|127\.0\.0\.1|postgres|host\.docker\.internal)[:/]/.test(connectionString);

/**
 * pg delegates certificate and hostname verification to Node TLS when
 * rejectUnauthorized is true. `verify-full` therefore requires the project CA
 * and refuses to silently fall back to encryption-without-authentication.
 *
 * `require` exists only as an explicit compatibility mode for environments that
 * have not installed the CA yet; it is never the default.
 */
export function databaseSslOptions(connectionString: string, input: DatabaseSslInput = {}) {
  if (isLocalDatabase(connectionString)) return undefined;
  const mode = input.mode ?? 'verify-full';
  if (mode === 'disable') return undefined;
  if (mode === 'require') return { rejectUnauthorized: false } as const;
  const ca = input.caPem?.trim() || decodeCa(input.caBase64);
  if (!ca) throw new Error('DB_SSL_CA or DB_SSL_CA_BASE64 is required when DB_SSL_MODE=verify-full');
  return { rejectUnauthorized: true, ca } as const;
}

function decodeCa(value?: string) {
  if (!value?.trim()) return undefined;
  let decoded: string;
  try { decoded = Buffer.from(value.trim(), 'base64').toString('utf8'); }
  catch { throw new Error('DB_SSL_CA_BASE64 is not valid base64'); }
  if (!decoded.includes('-----BEGIN CERTIFICATE-----')) throw new Error('DB_SSL_CA_BASE64 does not contain a PEM certificate');
  return decoded;
}
