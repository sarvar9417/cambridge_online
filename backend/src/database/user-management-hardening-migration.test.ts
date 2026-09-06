import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('./migrations/0119_user_identity_and_enrollment_hardening.sql', import.meta.url),
  'utf8',
);

describe('user management hardening migration', () => {
  it('invalidates stale identity proof, reset links and sessions when login identity changes', () => {
    expect(sql).toContain('new.email is distinct from old.email');
    expect(sql).toContain('new.username is distinct from old.username');
    expect(sql).toContain('new.password_hash is distinct from old.password_hash');
    expect(sql).toContain('update email_verification_tokens');
    expect(sql).toContain('update password_reset_tokens');
    expect(sql).toContain('update refresh_tokens');
    expect(sql).toContain('new.token_version := greatest(new.token_version, old.token_version + 1)');
    expect(sql).toContain('case when new.email is null then now() else null end');
  });

  it('backfills published assignment submissions for every active enrolment path', () => {
    expect(sql).toContain('backfill_published_submissions_on_enrolment_v1');
    expect(sql).toContain('after insert or update of left_at on enrollments');
    expect(sql).toContain('insert into submissions (assignment_id, student_id)');
    expect(sql).toContain('a.published_at is not null');
    expect(sql).toContain('a.archived_at is null');
    expect(sql).toContain('on conflict do nothing');
  });

  it('redacts user profile snapshots when a permanent purge is audited', () => {
    expect(sql).toContain('redact_user_purge_audit_v1');
    expect(sql).toContain("new.action = 'admin.user_purge'");
    expect(sql).toContain("where ref_table = 'users' and ref_id = new.ref_id");
    expect(sql).toContain("'{\"redacted\":true}'::jsonb");
    expect(sql).toContain("'role', new.before -> 'role'");
    expect(sql).toContain("'status', new.before -> 'status'");
  });
});
