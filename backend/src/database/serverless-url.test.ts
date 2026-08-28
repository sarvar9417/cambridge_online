import { describe, expect, it } from 'vitest';
import { serverlessDatabaseUrl } from './serverless-url.js';

describe('serverlessDatabaseUrl', () => {
  it('moves a Supabase session pooler URL to transaction mode on Vercel', () => {
    const value = serverlessDatabaseUrl(
      'postgresql://postgres.project:secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require',
      true,
    );
    const url = new URL(value);
    expect(url.hostname).toBe('aws-0-eu-central-1.pooler.supabase.com');
    expect(url.port).toBe('6543');
    expect(url.username).toBe('postgres.project');
    expect(url.searchParams.get('sslmode')).toBe('require');
  });

  it('does not rewrite a direct Supabase database URL', () => {
    const input = 'postgresql://postgres:secret@db.example.supabase.co:5432/postgres';
    expect(serverlessDatabaseUrl(input, true)).toBe(input);
  });

  it('does not rewrite local/development URLs', () => {
    const input = 'postgresql://postgres:secret@localhost:5432/campath';
    expect(serverlessDatabaseUrl(input, false)).toBe(input);
  });

  it('keeps an already-transaction-mode pooler URL unchanged in meaning', () => {
    const input = 'postgresql://postgres.project:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
    expect(new URL(serverlessDatabaseUrl(input, true)).port).toBe('6543');
  });
});
