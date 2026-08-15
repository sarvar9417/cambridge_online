-- What the applicant tells the approver about themselves.
--
-- Approval means choosing a role and a class. Without this the approver has a
-- name and an email and no way to tell which of eleven classes the person
-- belongs to, so every approval starts with a message asking. The applicant
-- writes it once instead.
--
-- Never trusted: it is the applicant's claim, shown to the approver, and the
-- role and class still come from the approver's own choice.

ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_note text;

COMMENT ON COLUMN users.registration_note IS
  'Free text written by the applicant at registration (class, group, reason). Untrusted; for the approver to read.';
