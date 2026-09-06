-- Harden account identity, class-enrolment side effects and irreversible purge privacy.
--
-- 1) Changing a login identifier invalidates stale proof/reset material and
--    existing sessions. A verification token issued for an old email must never
--    verify a newly assigned email address.
-- 2) Every active enrolment receives submissions for already-published
--    assignments, regardless of whether the enrolment came from Classes or the
--    admin People surface.
-- 3) A permanent user purge keeps the audit action/actor/time for accountability
--    but strips user-profile snapshots so the deleted email/name are not retained
--    inside audit_log JSON.

create or replace function enforce_user_identity_security_v1()
returns trigger
language plpgsql
as $$
begin
  if new.email is distinct from old.email then
    -- No email means there is no address left to prove; username-only accounts
    -- must remain able to sign in. A newly assigned/replaced email must be
    -- verified again.
    new.email_verified_at := case when new.email is null then now() else null end;

    update email_verification_tokens
       set used_at = coalesce(used_at, now())
     where user_id = old.id and used_at is null;
  end if;

  if new.email is distinct from old.email
     or new.username is distinct from old.username
     or new.password_hash is distinct from old.password_hash then
    -- Identity/password changes are security-boundary changes. Preserve a
    -- caller-supplied token-version bump without double incrementing it.
    new.token_version := greatest(new.token_version, old.token_version + 1);

    update refresh_tokens
       set revoked_at = coalesce(revoked_at, now())
     where user_id = old.id and revoked_at is null;

    -- Any reset link issued before an identity/password change is stale.
    update password_reset_tokens
       set used_at = coalesce(used_at, now())
     where user_id = old.id and used_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_identity_security_v1 on users;
create trigger trg_user_identity_security_v1
before update of email, username, password_hash on users
for each row execute function enforce_user_identity_security_v1();

create or replace function backfill_published_submissions_on_enrolment_v1()
returns trigger
language plpgsql
as $$
begin
  if new.left_at is null then
    insert into submissions (assignment_id, student_id)
    select a.id, new.student_id
      from assignments a
     where a.class_id = new.class_id
       and a.published_at is not null
       and a.archived_at is null
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_backfill_published_submissions_on_enrolment_v1 on enrollments;
create trigger trg_backfill_published_submissions_on_enrolment_v1
after insert or update of left_at on enrollments
for each row execute function backfill_published_submissions_on_enrolment_v1();

create or replace function redact_user_purge_audit_v1()
returns trigger
language plpgsql
as $$
begin
  if new.action = 'admin.user_purge' and new.ref_table = 'users' then
    -- Earlier lifecycle entries can contain full_name/email/username in before
    -- or after JSON. Keep the immutable audit envelope but redact its payload.
    update audit_log
       set before = case when before is null then null else '{"redacted":true}'::jsonb end,
           after  = case when after  is null then null else '{"redacted":true}'::jsonb end
     where ref_table = 'users' and ref_id = new.ref_id;

    new.before := case when new.before is null then null else jsonb_build_object(
      'redacted', true,
      'role', new.before -> 'role',
      'status', new.before -> 'status'
    ) end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_redact_user_purge_audit_v1 on audit_log;
create trigger trg_redact_user_purge_audit_v1
before insert on audit_log
for each row execute function redact_user_purge_audit_v1();
