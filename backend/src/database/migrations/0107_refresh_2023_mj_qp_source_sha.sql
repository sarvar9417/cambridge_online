-- Refresh stale raw-file SHA-256 values for the three official May/June 2023
-- Paper 1 QPs. The Google Drive source URLs are unchanged; current raw bytes were
-- downloaded from those exact URLs and independently hashed before this migration.
--
-- This is deliberately guarded by source_paper id, exact Drive URL and old SHA.

DO $$
DECLARE
  v_changed integer;
BEGIN
  WITH expected(id, source_url, old_sha, new_sha) AS (
    VALUES
      ('4fbcd52d-299a-472f-8947-e9b7981317ec'::uuid,
       'https://drive.google.com/file/d/1olMUpjSsmO7DPb328CNcddIGJaMWlY01/view?usp=drivesdk',
       '6d9083eaec4005a73ef3c355b476f1070738e5a9e4f741a279c897751a863a56',
       '547b5fef50d13125e25642bef9a06c8e96b63e27a742b045043543a87b3c0843'),
      ('b50884f3-4405-4200-97c6-12e3c2c636d8'::uuid,
       'https://drive.google.com/file/d/1oolpXM2X33Ga7qEoXYOJprvBkYmTLPkk/view?usp=drivesdk',
       '27ef2ce6e5205c95d341b71308fd05f8e6aea1c787940c66c9342455b882b47c',
       '2ce09e20a3bdc23506591fd65a99df636065d1a16a9939d4ad382660325a7d89'),
      ('c361ea2c-39df-4968-be4e-d4b09847f693'::uuid,
       'https://drive.google.com/file/d/1ouLex1wOdSRCsKBorERsdq409-SBzNzE/view?usp=drivesdk',
       'a0bd1c317e4628367333b2991e63696b684e087b98cadfa67dcf462a055b56f1',
       'b53ac2c6e575164af41410a1f4620a102aa2de42ed51fd9bfb586e24221f0d90')
  )
  UPDATE public.source_papers sp
  SET sha256 = e.new_sha
  FROM expected e
  WHERE sp.id = e.id
    AND sp.source_url = e.source_url
    AND sp.sha256 = e.old_sha;

  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed NOT IN (0, 3) THEN
    RAISE EXCEPTION 'refresh_2023_mj_qp_source_sha_partial:%', v_changed;
  END IF;

  IF EXISTS (
    WITH expected(id, new_sha) AS (
      VALUES
        ('4fbcd52d-299a-472f-8947-e9b7981317ec'::uuid,'547b5fef50d13125e25642bef9a06c8e96b63e27a742b045043543a87b3c0843'),
        ('b50884f3-4405-4200-97c6-12e3c2c636d8'::uuid,'2ce09e20a3bdc23506591fd65a99df636065d1a16a9939d4ad382660325a7d89'),
        ('c361ea2c-39df-4968-be4e-d4b09847f693'::uuid,'b53ac2c6e575164af41410a1f4620a102aa2de42ed51fd9bfb586e24221f0d90')
    )
    SELECT 1
    FROM expected e
    JOIN public.source_papers sp ON sp.id=e.id
    WHERE sp.sha256 IS DISTINCT FROM e.new_sha
  ) THEN
    RAISE EXCEPTION 'refresh_2023_mj_qp_source_sha_postcondition';
  END IF;
END
$$;
