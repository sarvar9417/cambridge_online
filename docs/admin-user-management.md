# Admin user management

The existing **Boshqaruv → Odamlar** approval queue is the single owner-facing user-management surface. It now covers the whole account lifecycle; no parallel user model or second admin page is introduced.

## Owner capabilities

- search and filter by account status and role with server-side pagination
- create an already-approved account with an initial role and optional class/group
- edit full name, email and username
- change a user's password directly; all existing sessions are revoked
- issue the existing one-shot password reset link
- revoke all sessions without changing the password
- change role
- move a student to a class/group, add staff to classes, and remove class membership
- suspend and reactivate an account
- approve, reject, reinstate and manually verify email using the existing registration workflow
- inspect an account-specific audit history
- safe delete an unused account
- explicitly purge an account when the owner intentionally accepts an irreversible operation
- select several users and suspend, reactivate or revoke sessions in one UI operation

## Safety rules

- privileged management routes remain owner-only
- the teacher reset-link exception is deliberately narrow: a teacher may issue a reset link only for an **active student in the same school**; staff and cross-school accounts are blocked
- owners administer only their own school
- tenant-less pending/rejected registrations are exposed as an onboarding queue only while the installation has exactly **one** school; if a second school exists, that ambiguous queue fails closed until registration has an explicit school-selection/invite mechanism
- an owner cannot change their own role/status or delete/purge their own account
- passwords are Argon2 hashes and never returned by the API
- password, email or username changes invalidate stale sessions and one-shot reset material; changing an email also invalidates old verification tokens and requires the new address to be verified
- username-only accounts remain usable when an email address is removed
- suspension and role changes invalidate existing sessions
- changing a user into a student removes teacher-class links; classes they owned are transferred to the acting owner
- moving a student closes any other active enrolment before opening the selected class
- every active enrolment path backfills submissions for already-published, non-archived assignments
- a group must belong to the selected class, can be assigned only to a student, and class/group assignment cannot cross school boundaries
- safe delete discovers direct user foreign keys from PostgreSQL metadata and refuses accounts with meaningful academic/administrative data
- irreversible purge requires the literal confirmation `DELETE`; user-owned `ON DELETE CASCADE` data is deleted and nullable historical references are cleared
- required `NO ACTION`/`RESTRICT` references transfer to the acting owner **only** for the explicit ownership allowlist (`assignments.created_by`, `classes.owner_id`, `exports.requested_by`, `invites.created_by`); any unknown future required user FK fails closed and blocks purge
- when a permanent purge is audited, user-profile snapshots in that user's audit history are redacted so deleted name/email/username data is not retained inside audit JSON
- every sensitive management action is written to `audit_log`

## API additions

Under `/api/v1/admin/users`:

- `POST /` — create a user
- `PATCH /:id` — edit identity fields
- `POST /:id/password` — assign a new password
- `POST /:id/revoke-sessions` — sign out all devices
- `GET /:id/audit` — account audit history
- `POST /:id/classes` — assign/move class membership
- `DELETE /:id/classes/:classId` — remove class membership
- `POST /:id/purge` — irreversible account purge (`{"confirm":"DELETE"}`)

The existing approval, rejection, status, role, reset-code, email-verification, reinstate and safe-delete endpoints remain in place and are reused by the expanded UI.

## Operational verification

After deploying account-lifecycle changes:

1. run the repository test/typecheck/build gate (`npm run verify`)
2. apply all pending database migrations, including `0120_user_identity_and_enrollment_hardening.sql`
3. run `backend/src/database/audits/admin-user-management.sql`; every query must return zero rows
4. smoke-test the People surface for search/pagination, approve/reject, role/class changes, password/session controls, safe delete and purge confirmation

The `0120` DDL has also been syntax- and behavior-validated against the production Supabase schema inside a transaction that is rolled back: identity changes revoke stale session/reset/verification material, username-only accounts remain sign-in capable, purge audit snapshots redact profile PII, and enrollment backfill creates submissions for already-published assignments when such an assignment exists.
