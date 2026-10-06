-- Route open registrations to the single school that actually has active owners.
--
-- Seed/archived school rows with no active owner must not make pending registrations
-- disappear from the real owner's approval queue. Auto-scope remains fail-closed:
-- it runs only when exactly one distinct school currently has an active owner.

WITH intake AS (
  SELECT CASE
    WHEN count(DISTINCT school_id)=1 THEN max(school_id::text)::uuid
    ELSE NULL::uuid
  END AS school_id
  FROM users
  WHERE role='owner'
    AND status='active'
    AND is_active=true
    AND school_id IS NOT NULL
)
UPDATE users u
SET school_id=intake.school_id,
    updated_at=now()
FROM intake
WHERE u.is_active=true
  AND u.status='pending'
  AND u.school_id IS NULL
  AND intake.school_id IS NOT NULL;
