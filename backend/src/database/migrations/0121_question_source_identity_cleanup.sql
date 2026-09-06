-- Preserve one unambiguous Cambridge source identity per question occurrence.
--
-- This migration does NOT deduplicate source-equivalent questions across
-- official variants. Those rows represent distinct Cambridge source papers and
-- must remain in the canonical corpus.

DO $$
DECLARE
  v_old_count integer;
  v_new_count integer;
BEGIN
  SELECT count(*) INTO v_old_count
  FROM questions
  WHERE id = '4e02bf8c-e7cb-4915-be59-24ee6a717d79'::uuid
    AND source_paper_id = '4fbcd52d-299a-472f-8947-e9b7981317ec'::uuid
    AND path = '6.a'
    AND display_ref = '9618/11/M/J/23 Q6';

  SELECT count(*) INTO v_new_count
  FROM questions
  WHERE id = '4e02bf8c-e7cb-4915-be59-24ee6a717d79'::uuid
    AND source_paper_id = '4fbcd52d-299a-472f-8947-e9b7981317ec'::uuid
    AND path = '6.a'
    AND display_ref = '9618/11/M/J/23 Q6(a)';

  IF v_old_count = 1 AND v_new_count = 0 THEN
    UPDATE questions
    SET display_ref = '9618/11/M/J/23 Q6(a)',
        updated_at = now()
    WHERE id = '4e02bf8c-e7cb-4915-be59-24ee6a717d79'::uuid
      AND source_paper_id = '4fbcd52d-299a-472f-8947-e9b7981317ec'::uuid
      AND path = '6.a'
      AND display_ref = '9618/11/M/J/23 Q6';
  ELSIF v_old_count = 0 AND v_new_count = 1 THEN
    -- Idempotent replay after the source-reference repair has already landed.
    NULL;
  ELSE
    RAISE EXCEPTION
      'question_source_identity_cleanup_precondition_failed old=% new=%',
      v_old_count, v_new_count;
  END IF;
END $$;

DO $$
DECLARE
  v_duplicate_refs integer;
BEGIN
  SELECT count(*) INTO v_duplicate_refs
  FROM (
    SELECT display_ref
    FROM questions
    GROUP BY display_ref
    HAVING count(*) > 1
  ) duplicate_refs;

  IF v_duplicate_refs <> 0 THEN
    RAISE EXCEPTION
      'question_source_identity_duplicate_display_refs_remaining=%',
      v_duplicate_refs;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS questions_display_ref_key
  ON questions(display_ref);
