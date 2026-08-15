import { describe, expect, it } from 'vitest';
import { databaseSslOptions } from './ssl.js';

const pem = '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----';

describe('database SSL configuration', () => {
  it('does not force TLS for a local postgres connection', () => {
    expect(databaseSslOptions('postgresql://postgres:x@localhost:5432/postgres')).toBeUndefined();
  });

  it('defaults remote databases to certificate and hostname verification', () => {
    expect(databaseSslOptions('postgresql://u:p@db.project.supabase.co:5432/postgres', { caPem: pem }))
      .toEqual({ rejectUnauthorized: true, ca: pem });
  });

  it('refuses verify-full without a CA instead of silently disabling verification', () => {
    expect(() => databaseSslOptions('postgresql://u:p@db.project.supabase.co:5432/postgres'))
      .toThrow(/DB_SSL_CA/);
  });

  it('supports base64 CA material for secret/environment stores', () => {
    expect(databaseSslOptions('postgresql://u:p@pooler.supabase.com:5432/postgres', { caBase64: Buffer.from(pem).toString('base64') }))
      .toEqual({ rejectUnauthorized: true, ca: pem });
  });

  it('keeps unverified TLS only as an explicit compatibility mode', () => {
    expect(databaseSslOptions('postgresql://u:p@pooler.supabase.com:5432/postgres', { mode: 'require' }))
      .toEqual({ rejectUnauthorized: false });
  });
});
