-- Recycle join codes only after a short terminal-session retention window.

ALTER TABLE live_exam_sessions
  ADD COLUMN join_code_expires_at timestamptz;

UPDATE live_exam_sessions
SET join_code_expires_at = CASE
  WHEN status IN ('finished', 'cancelled') THEN coalesce(finished_at, updated_at)
  ELSE now() + interval '24 hours'
END
WHERE join_code_expires_at IS NULL;

ALTER TABLE live_exam_sessions
  ALTER COLUMN join_code_expires_at SET DEFAULT (now() + interval '24 hours'),
  ALTER COLUMN join_code_expires_at SET NOT NULL;

ALTER TABLE live_exam_sessions DROP CONSTRAINT IF EXISTS live_exam_sessions_join_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS live_exam_sessions_active_join_code_unique
  ON live_exam_sessions (join_code)
  WHERE status NOT IN ('finished', 'cancelled');

CREATE OR REPLACE FUNCTION public.guard_live_exam_join_code_retention()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status NOT IN ('finished', 'cancelled') AND EXISTS (
    SELECT 1 FROM live_exam_sessions previous
    WHERE previous.join_code = NEW.join_code
      AND previous.id <> NEW.id
      AND previous.status IN ('finished', 'cancelled')
      AND coalesce(previous.finished_at, previous.updated_at) > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'live_join_code_retention';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_exam_join_code_retention ON live_exam_sessions;
CREATE TRIGGER live_exam_join_code_retention
BEFORE INSERT OR UPDATE OF join_code, status
ON live_exam_sessions FOR EACH ROW EXECUTE FUNCTION public.guard_live_exam_join_code_retention();