import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('./migrations/0142_security_function_search_path.sql', import.meta.url),
  'utf8',
);

const functions = [
  'backfill_published_submissions_on_enrolment_v1',
  'enforce_user_identity_security_v1',
  'redact_user_purge_audit_v1',
] as const;

describe('0142 security function search_path hardening', () => {
  it.each(functions)('pins %s to public and pg_temp', (name) => {
    expect(migration).toContain(`ALTER FUNCTION public.${name}()`);
  });

  it('pins trusted schemas and asserts the postcondition', () => {
    expect(migration.match(/SET search_path TO 'public', 'pg_temp'/g)).toHaveLength(3);
    expect(migration).toContain("p.proconfig @> ARRAY['search_path=public, pg_temp']::text[]");
    expect(migration).toContain('security search_path hardening failed for functions');
  });
});
