import { describe, expect, it } from 'vitest';
import { databaseSslOptions, databaseSslUsesVerifiedIdentity, stripConnectionStringSslPolicy } from './ssl.js';

const pem = '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----';
const remote = 'postgresql://u:p@db.project.supabase.co:5432/postgres';

describe('database SSL configuration', () => {
  it('removes connection-string SSL flags while preserving unrelated parameters', () => {
    const normalized=stripConnectionStringSslPolicy(
      'postgresql://u:p@pooler.supabase.com:6543/postgres?sslmode=require&uselibpqcompat=true&application_name=campath',
    );
    const url=new URL(normalized);
    expect(url.searchParams.has('sslmode')).toBe(false);
    expect(url.searchParams.has('uselibpqcompat')).toBe(false);
    expect(url.searchParams.get('application_name')).toBe('campath');
    expect(url.hostname).toBe('pooler.supabase.com');
    expect(url.port).toBe('6543');
  });

  it('leaves malformed connection strings untouched for pg validation', () => {
    expect(stripConnectionStringSslPolicy('not a postgres url')).toBe('not a postgres url');
  });

  it('does not force TLS for a local postgres connection', () => {
    expect(databaseSslOptions('postgresql://postgres:x@localhost:5432/postgres')).toBeUndefined();
  });

  it('uses verified TLS automatically when a CA is configured', () => {
    expect(databaseSslOptions(remote, { caPem: pem }))
      .toEqual({ rejectUnauthorized: true, ca: pem });
    expect(databaseSslUsesVerifiedIdentity(remote, { caPem: pem })).toBe(true);
  });

  it('keeps encrypted compatibility in auto mode until the CA is installed', () => {
    expect(databaseSslOptions(remote)).toEqual({ rejectUnauthorized: false });
    expect(databaseSslUsesVerifiedIdentity(remote)).toBe(false);
  });

  it('refuses explicit verify-full without a CA', () => {
    expect(() => databaseSslOptions(remote, { mode: 'verify-full' }))
      .toThrow(/DB_SSL_CA/);
  });

  it('supports base64 CA material for secret/environment stores', () => {
    expect(databaseSslOptions('postgresql://u:p@pooler.supabase.com:5432/postgres', { caBase64: Buffer.from(pem).toString('base64') }))
      .toEqual({ rejectUnauthorized: true, ca: pem });
  });

  it('keeps unverified TLS as an explicit compatibility mode too', () => {
    expect(databaseSslOptions('postgresql://u:p@pooler.supabase.com:5432/postgres', { mode: 'require' }))
      .toEqual({ rejectUnauthorized: false });
  });
});
