import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('./migrations/0195_canonical_mark_scheme_view_security.sql', import.meta.url),
  'utf8',
).toLowerCase();

describe('canonical mark-scheme view security migration', () => {
  it('runs the view with the querying role so underlying RLS remains effective', () => {
    expect(sql).toContain('alter view public.canonical_mark_schemes');
    expect(sql).toContain('security_invoker = true');
  });

  it('removes direct Data API access to unreleased mark-scheme guidance', () => {
    expect(sql).toContain('revoke all privileges on table public.canonical_mark_schemes');
    expect(sql).toContain('from public, anon, authenticated');
  });
});
