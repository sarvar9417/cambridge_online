# Admin user management

The existing **Boshqaruv → Odamlar** approval queue is the single owner-facing user-management surface. It now covers the whole account lifecycle; no parallel user model or second admin page is introduced.

## Owner capabilities

- search and filter by account status and role
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

- privileged management routes remain owner-only; the pre-existing teacher reset-link exception remains unchanged
- an owner cannot change their own role/status or delete/purge their own account
- passwords are Argon2 hashes and never returned by the API
- direct password changes, suspension and role changes invalidate existing sessions
- changing a user into a student removes teacher-class links; classes they owned are transferred to the acting owner
- moving a student closes any other active enrolment before opening the selected class
- a group must belong to the selected class
- safe delete refuses accounts with dependent academic/administrative data
- irreversible purge requires the literal confirmation `DELETE`; cascade-owned data follows database rules, nullable historical references are cleared, and required historical ownership is transferred to the acting owner
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
