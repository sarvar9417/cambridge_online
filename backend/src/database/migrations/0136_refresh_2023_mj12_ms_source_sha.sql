-- Refresh the stale raw-file SHA-256 pin for the official 9618/12
-- May/June 2023 mark scheme.
--
-- The exact already-pinned Google Drive file was independently fetched as raw
-- PDF bytes. It has one Drive revision, identifies itself as 9618/12 May/June
-- 2023 MARK SCHEME, is 10 pages / 220988 bytes, and hashes to the new SHA below.
-- The repair remains fail-closed on exact source identity and previous SHA.

DO $$
DECLARE
  v_changed integer;
BEGIN
  UPDATE public.source_papers sp
  SET sha256='bc0db739175ead33ca2acb9af7fc46cdc2f8153a05ac867b943ccb1ad09f5a2c'
  FROM public.components c
  WHERE sp.id='5002d9b1-b7aa-468f-b753-66e4e5252b14'::uuid
    AND c.id=sp.component_id
    AND c.number=1
    AND sp.kind='MS'::paper_kind
    AND sp.year=2023
    AND sp.series='MJ'::exam_series
    AND sp.variant=2
    AND sp.source_url='https://drive.google.com/file/d/1oB7dty3NpmhuwIwaxgUCBJ1MWne0j9gq/view?usp=drivesdk'
    AND sp.storage_path='drive/9618_s23_ms_12.pdf'
    AND sp.sha256='6e00fdadc271e97ad0392c69d338091456c4279db28c72242f20ea411fca1396';

  GET DIAGNOSTICS v_changed=ROW_COUNT;
  IF v_changed NOT IN (0,1) THEN
    RAISE EXCEPTION 'refresh_2023_mj12_ms_source_sha_unexpected_count:%',v_changed;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.source_papers sp
    JOIN public.components c ON c.id=sp.component_id
    WHERE sp.id='5002d9b1-b7aa-468f-b753-66e4e5252b14'::uuid
      AND c.number=1
      AND sp.kind='MS'::paper_kind
      AND sp.year=2023
      AND sp.series='MJ'::exam_series
      AND sp.variant=2
      AND sp.source_url='https://drive.google.com/file/d/1oB7dty3NpmhuwIwaxgUCBJ1MWne0j9gq/view?usp=drivesdk'
      AND sp.storage_path='drive/9618_s23_ms_12.pdf'
      AND lower(sp.sha256)='bc0db739175ead33ca2acb9af7fc46cdc2f8153a05ac867b943ccb1ad09f5a2c'
  ) THEN
    RAISE EXCEPTION 'refresh_2023_mj12_ms_source_sha_postcondition';
  END IF;
END
$$;
