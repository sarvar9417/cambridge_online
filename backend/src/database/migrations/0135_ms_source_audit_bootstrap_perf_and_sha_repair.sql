-- Repair the historical 9618 mark-scheme source-audit bootstrap without
-- weakening source identity or promotion gates.
--
-- 1) Add the missing lookup indexes used by ms_source_audit_bootstrap_v3().
--    The bootstrap intentionally inspects groups, levels, unresolved findings,
--    assignment usage and answer usage for every candidate scheme; these indexes
--    keep that fail-closed validation within the Edge Function statement budget.
-- 2) Refresh two stale May/June 2023 Paper 1 MS SHA-256 pins. The exact Google
--    Drive files were downloaded from the already-pinned URLs and hashed as raw
--    PDF bytes before this migration. Identity is guarded by source_paper id,
--    URL, storage path, paper metadata and the previous SHA.

CREATE INDEX IF NOT EXISTS mark_scheme_groups_mark_scheme_id_idx
  ON public.mark_scheme_groups(mark_scheme_id);

CREATE INDEX IF NOT EXISTS mark_scheme_levels_mark_scheme_id_idx
  ON public.mark_scheme_levels(mark_scheme_id);

CREATE INDEX IF NOT EXISTS validation_findings_open_ref_idx
  ON public.validation_findings(ref_table, ref_id)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS assignment_questions_question_id_idx
  ON public.assignment_questions(question_id);

CREATE INDEX IF NOT EXISTS answers_question_id_idx
  ON public.answers(question_id);

DO $$
DECLARE
  v_changed integer;
BEGIN
  WITH expected(
    id,
    source_url,
    storage_path,
    year,
    series,
    component_number,
    variant,
    old_sha,
    new_sha
  ) AS (
    VALUES
      (
        '75a12934-1fa7-4ae3-b7e2-a4ce1f2291e5'::uuid,
        'https://drive.google.com/file/d/1oArdwdbG804w6I4HAm8rsKKWlfF6OESJ/view?usp=drivesdk',
        'drive/9618_s23_ms_11.pdf',
        2023,
        'MJ'::paper_series,
        1,
        1,
        '4a418fe94c3ba5a4783664dbdf4bafb6ac2284f9c0f044a6214c6fb703293ba6',
        '9955c377d09a08b7def28b097d0f1a2247d7097b30d59b525eaf73805055898c'
      ),
      (
        '4a0211e7-17f0-4fec-b75b-2e1b3dc72e44'::uuid,
        'https://drive.google.com/file/d/1oDh4H33M1Q5AQtPmUCtzD2zPHgts2CTO/view?usp=drivesdk',
        'drive/9618_s23_ms_13.pdf',
        2023,
        'MJ'::paper_series,
        1,
        3,
        'df6bad45ec9923dc70300ea43644cff6a4dad34c8e642b447ee01fa716923954',
        'e42d1cc9bdc1e41f9c08fa51f98bdc024d3a0b2984c98b50742f810a6c6762fd'
      )
  )
  UPDATE public.source_papers sp
  SET sha256=e.new_sha
  FROM expected e
  JOIN public.components c ON c.number=e.component_number
  WHERE sp.id=e.id
    AND sp.component_id=c.id
    AND sp.kind='MS'::paper_kind
    AND sp.year=e.year
    AND sp.series=e.series
    AND sp.variant=e.variant
    AND sp.source_url=e.source_url
    AND sp.storage_path=e.storage_path
    AND sp.sha256=e.old_sha;

  GET DIAGNOSTICS v_changed=ROW_COUNT;
  IF v_changed NOT IN (0, 2) THEN
    RAISE EXCEPTION 'ms_source_sha_repair_partial:%', v_changed;
  END IF;

  IF EXISTS (
    WITH expected(
      id,
      source_url,
      storage_path,
      year,
      series,
      component_number,
      variant,
      new_sha
    ) AS (
      VALUES
        (
          '75a12934-1fa7-4ae3-b7e2-a4ce1f2291e5'::uuid,
          'https://drive.google.com/file/d/1oArdwdbG804w6I4HAm8rsKKWlfF6OESJ/view?usp=drivesdk',
          'drive/9618_s23_ms_11.pdf',
          2023,
          'MJ'::paper_series,
          1,
          1,
          '9955c377d09a08b7def28b097d0f1a2247d7097b30d59b525eaf73805055898c'
        ),
        (
          '4a0211e7-17f0-4fec-b75b-2e1b3dc72e44'::uuid,
          'https://drive.google.com/file/d/1oDh4H33M1Q5AQtPmUCtzD2zPHgts2CTO/view?usp=drivesdk',
          'drive/9618_s23_ms_13.pdf',
          2023,
          'MJ'::paper_series,
          1,
          3,
          'e42d1cc9bdc1e41f9c08fa51f98bdc024d3a0b2984c98b50742f810a6c6762fd'
        )
    )
    SELECT 1
    FROM expected e
    LEFT JOIN public.source_papers sp ON sp.id=e.id
    LEFT JOIN public.components c ON c.id=sp.component_id
    WHERE sp.id IS NULL
       OR sp.kind<>'MS'::paper_kind
       OR sp.year<>e.year
       OR sp.series<>e.series
       OR sp.variant<>e.variant
       OR c.number<>e.component_number
       OR sp.source_url<>e.source_url
       OR sp.storage_path<>e.storage_path
       OR lower(sp.sha256)<>lower(e.new_sha)
  ) THEN
    RAISE EXCEPTION 'ms_source_sha_repair_postcondition';
  END IF;
END
$$;
