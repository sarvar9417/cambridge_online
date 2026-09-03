-- Source-backed repair for Cambridge 9618 QP response-guide artefacts.
--
-- Audited against the official Question Papers in the user-provided Google Drive
-- source set. The only mutation is removal of printed answer-line/table row labels
-- (1, 2, 3, 4) and page numbers that were accidentally appended to leaf stem_md.
--
-- Guards:
--   * exact display_ref + marks
--   * exact source-paper SHA-256
--   * exact pre-repair question-state hash
--   * exact terminal artefact tail
--   * provenance written to question_source_repair_history
--
-- Mark schemes, context_md, display_ref, taxonomy mappings and marks are untouched.

DO $$
DECLARE
  r RECORD;
  q RECORD;
  v_new_stem TEXT;
  v_old_hash TEXT;
  v_new_hash TEXT;
  v_changed INTEGER := 0;
BEGIN
  CREATE TEMP TABLE _source_verified_response_guide_repairs (
    display_ref TEXT PRIMARY KEY,
    marks INTEGER NOT NULL,
    source_sha256 TEXT NOT NULL,
    expected_old_hash TEXT NOT NULL,
    artifact_tail TEXT NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_verified_response_guide_repairs
    (display_ref, marks, source_sha256, expected_old_hash, artifact_tail)
  VALUES
    ('9618/12/M/J/24 Q3(b)', 4, '871b047e73c2ce0dd3c2dd1c47b7d4e176c886e61af08ffe12c6b9734285d3de', '57a45029cbe2bd9e658e3d7db9220315', E'\n\n1\n\n2'),
    ('9618/12/O/N/21 Q5(b)(i)', 4, '9fa28bfd27645df25197c518aa07573c14ea301a3fe024c23b03c28dadea7b36', '3bb9a76d7e6dc5e6a93822b4a39a4145', E'\n1\n2\n9'),
    ('9618/13/M/J/24 Q7(f)(i)', 4, '79f3dbe24332c41b155e25ba48d3a8cb75399e98d5bb9cdf9a1e71de0f4645bd', 'a95a4ab53cb4315927238a15f0c0eb1e', E'\n\n1\n\n2'),
    ('9618/31/M/J/22 Q4(b)', 2, 'cb062c2734a9865390415d23f24070fe007c4ae01ea265352c0c621136b0bbc3', 'fe5b2b2b96d82d002b897ee1771d4b67', E'\n1\n2\n8'),
    ('9618/31/M/J/22 Q5(c)', 2, 'cb062c2734a9865390415d23f24070fe007c4ae01ea265352c0c621136b0bbc3', 'e0eb290b14337d345bc94671be46be56', E'\n1\n2'),
    ('9618/31/M/J/22 Q8(a)(i)', 2, 'cb062c2734a9865390415d23f24070fe007c4ae01ea265352c0c621136b0bbc3', 'da9dc553cfeb39e6e4a2d8f4bd8b5495', E'\n1\n2'),
    ('9618/31/M/J/22 Q8(a)(ii)', 2, 'cb062c2734a9865390415d23f24070fe007c4ae01ea265352c0c621136b0bbc3', '38c395495ebe56b0efa889a3a56eb03f', E'\n1\n2'),
    ('9618/31/O/N/21 Q10(a)', 3, '4c5bb33485a256b019d6c5f0184e5dfa65d0c666697cca21176f23a50c4a4614', 'a335581b248b31768175a1ddb0103e22', E'\n1\n2\n3'),
    ('9618/31/O/N/21 Q10(c)', 2, '4c5bb33485a256b019d6c5f0184e5dfa65d0c666697cca21176f23a50c4a4614', 'ebf1b35ee0072cdd25c5533a796aaf4a', E'\n1\n2\n14'),
    ('9618/31/O/N/24 Q2', 4, '2679dc897568988e4a63a1679900e353a0e8484a5589d5a8944be3c6c50d3c19', '809c95adf3a96516a598a5bb8b76eaa2', E'\n1\n2\n3\n4'),
    ('9618/32/O/N/21 Q10(a)', 3, '62e4197f425687a37eaaa42b4c3b352d4f7283487926daae63db22eb562c44eb', 'bc3d3c68e4e6f2655e270bc72600acde', E'\n1\n2\n3'),
    ('9618/32/O/N/21 Q10(c)', 2, '62e4197f425687a37eaaa42b4c3b352d4f7283487926daae63db22eb562c44eb', '80221e0f8453f8aca179302ec7214a10', E'\n1\n2\n14'),
    ('9618/32/O/N/22 Q2(a)', 2, '16771c5c9910deb8f5d4691fed5df35a75d582016ae2ccd5a2b97733a75519dd', '5f58f259ffda4fbff6b3427158b0a40e', E'\n1\n2'),
    ('9618/32/O/N/24 Q10(b)', 3, '94438657867c9301845ef932a8cbc09abb70b41cbf675764c030db8c0b529be8', '0f63e5d0f4d7e090291be9a8aebc6f71', E'\n1\n2\n3\n12'),
    ('9618/32/O/N/24 Q8', 4, '94438657867c9301845ef932a8cbc09abb70b41cbf675764c030db8c0b529be8', 'ca4c48af6a26b79f32f9bb93feae865d', E'\n1\n2\n3\n4'),
    ('9618/33/M/J/22 Q4(b)', 2, '5d9f3ef6c2f000f9b61547c47791adb9c92d9f2fac711c2b378d541561aa6565', '31ad2103723dfeafe94be4daccfbce34', E'\n1\n2\n8'),
    ('9618/33/M/J/22 Q5(c)', 2, '5d9f3ef6c2f000f9b61547c47791adb9c92d9f2fac711c2b378d541561aa6565', 'b3b010d2b957171c533f4fffda70b82d', E'\n1\n2'),
    ('9618/33/M/J/22 Q8(a)(i)', 2, '5d9f3ef6c2f000f9b61547c47791adb9c92d9f2fac711c2b378d541561aa6565', '5eb2e89b35d1d5fa1d7b08e4eacbcf27', E'\n1\n2'),
    ('9618/33/M/J/22 Q8(a)(ii)', 2, '5d9f3ef6c2f000f9b61547c47791adb9c92d9f2fac711c2b378d541561aa6565', '7826224665c85640541ca1a86fe2c4c8', E'\n1\n2'),
    ('9618/33/O/N/24 Q2', 4, '21da638061df7ce980892f94c35498a143b43cff6aedfb35c5024d133fe25a14', '4b4c0da91c545577ae18e3c5af8d087d', E'\n1\n2\n3\n4');

  FOR r IN SELECT * FROM _source_verified_response_guide_repairs ORDER BY display_ref LOOP
    SELECT
      qu.*,
      sp.sha256 AS actual_source_sha256,
      sp.id AS actual_source_paper_id
    INTO q
    FROM questions qu
    JOIN source_papers sp ON sp.id = qu.source_paper_id
    JOIN syllabi sy ON sy.id = sp.syllabus_id
    WHERE qu.display_ref = r.display_ref
      AND sy.code = '9618'
      AND sp.kind = 'QP';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'source_verified_response_guide_repair_missing:%', r.display_ref;
    END IF;

    IF q.marks <> r.marks THEN
      RAISE EXCEPTION 'source_verified_response_guide_repair_marks:%:%:%',
        r.display_ref, q.marks, r.marks;
    END IF;

    IF q.actual_source_sha256 IS DISTINCT FROM r.source_sha256 THEN
      RAISE EXCEPTION 'source_verified_response_guide_repair_sha:%', r.display_ref;
    END IF;

    v_old_hash := md5(
      coalesce(q.stem_md, '') || chr(31) ||
      coalesce(q.context_md, '') || chr(31) ||
      coalesce(q.display_ref, '')
    );

    IF v_old_hash = r.expected_old_hash THEN
      IF right(q.stem_md, char_length(r.artifact_tail)) <> r.artifact_tail THEN
        RAISE EXCEPTION 'source_verified_response_guide_repair_tail:%', r.display_ref;
      END IF;

      v_new_stem := left(q.stem_md, char_length(q.stem_md) - char_length(r.artifact_tail));

      IF nullif(btrim(v_new_stem), '') IS NULL THEN
        RAISE EXCEPTION 'source_verified_response_guide_repair_empty:%', r.display_ref;
      END IF;

      v_new_hash := md5(
        coalesce(v_new_stem, '') || chr(31) ||
        coalesce(q.context_md, '') || chr(31) ||
        coalesce(q.display_ref, '')
      );

      IF NOT EXISTS (
        SELECT 1
        FROM question_source_repair_history h
        WHERE h.question_id = q.id
          AND h.repair_tag = 'source-backed-qp-answer-line-artifact-v1'
          AND h.old_hash = v_old_hash
          AND h.new_hash = v_new_hash
      ) THEN
        INSERT INTO question_source_repair_history (
          question_id,
          source_paper_id,
          repair_tag,
          source_sha256,
          old_hash,
          new_hash,
          old_stem_md,
          old_context_md,
          old_display_ref,
          new_stem_md,
          new_context_md,
          new_display_ref
        )
        VALUES (
          q.id,
          q.actual_source_paper_id,
          'source-backed-qp-answer-line-artifact-v1',
          r.source_sha256,
          v_old_hash,
          v_new_hash,
          q.stem_md,
          q.context_md,
          q.display_ref,
          v_new_stem,
          q.context_md,
          q.display_ref
        );
      END IF;

      UPDATE questions
      SET stem_md = v_new_stem,
          prompt_version = 'source-backed-qp-answer-line-artifact-v1',
          extract_confidence = greatest(coalesce(extract_confidence, 0), 0.99),
          updated_at = now()
      WHERE id = q.id;

      v_changed := v_changed + 1;
    ELSE
      -- Replay is allowed only when this exact source-backed repair is already recorded.
      IF NOT EXISTS (
        SELECT 1
        FROM question_source_repair_history h
        WHERE h.question_id = q.id
          AND h.repair_tag = 'source-backed-qp-answer-line-artifact-v1'
          AND h.new_hash = v_old_hash
      ) THEN
        RAISE EXCEPTION 'source_verified_response_guide_repair_stale:%:%',
          r.display_ref, v_old_hash;
      END IF;
    END IF;
  END LOOP;

  IF v_changed NOT IN (0, 20) THEN
    RAISE EXCEPTION 'source_verified_response_guide_repair_partial:%', v_changed;
  END IF;
END
$$;

-- Postcondition: the source-confirmed response-guide tail signature is gone from
-- every repaired question, while marks and references remain unchanged.
DO $$
DECLARE
  v_remaining INTEGER;
BEGIN
  SELECT count(*)
  INTO v_remaining
  FROM questions q
  JOIN source_papers sp ON sp.id = q.source_paper_id
  JOIN syllabi s ON s.id = sp.syllabus_id
  WHERE s.code = '9618'
    AND sp.kind = 'QP'
    AND q.status = 'approved'
    AND q.marks > 0
    AND regexp_replace(regexp_replace(q.stem_md, E'[\r\n]+', ' ', 'g'), '[[:space:]]+', ' ', 'g')
        ~ E'(^|[[:space:]])1[[:space:]]+2([[:space:]]+3)?([[:space:]]+[0-9]{1,2})?[[:space:]]*$';

  IF v_remaining <> 0 THEN
    RAISE EXCEPTION 'source_verified_response_guide_repair_postcondition:%', v_remaining;
  END IF;
END
$$;
