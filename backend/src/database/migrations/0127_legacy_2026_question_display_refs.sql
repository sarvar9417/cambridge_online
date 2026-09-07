-- The archived Phase-0 2026 seed was moved to source_papers.variant=0 by 0122,
-- but its question display_ref values still occupy the official Cambridge refs.
-- 0121 intentionally makes live source refs globally unique, so rename only the
-- archived legacy seed while preserving every UUID/answer/assignment reference.

DO $$
DECLARE
  v_legacy_qp uuid;
  v_total integer;
  v_archived integer;
  v_old integer;
  v_new integer;
BEGIN
  SELECT sp.id INTO v_legacy_qp
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code='9618'
    AND c.number=1
    AND sp.kind='QP'::paper_kind
    AND sp.year=2026
    AND sp.series='MJ'::exam_series
    AND sp.variant=0
    AND sp.storage_path='legacy/manual/phase-0-qp.pdf';

  IF v_legacy_qp IS NULL THEN
    -- Clean installs have no Phase-0 seed to relocate.
    RETURN;
  END IF;

  SELECT count(*),count(*) FILTER(WHERE status='archived'::review_status),
         count(*) FILTER(WHERE display_ref LIKE '9618/11/M/J/26 Q%'),
         count(*) FILTER(WHERE display_ref LIKE 'LEGACY/9618/11/M/J/26 Q%')
  INTO v_total,v_archived,v_old,v_new
  FROM public.questions
  WHERE source_paper_id=v_legacy_qp;

  IF v_total<>40 OR v_archived<>40 OR v_old+v_new<>40 THEN
    RAISE EXCEPTION
      'legacy_2026_display_ref_precondition_failed total=% archived=% old=% new=%',
      v_total,v_archived,v_old,v_new;
  END IF;

  UPDATE public.questions
  SET display_ref='LEGACY/'||display_ref,
      notes=concat_ws(E'\n',nullif(notes,''),'source-identity: archived Phase-0 seed; original display_ref preserved after LEGACY/ prefix.'),
      updated_at=now()
  WHERE source_paper_id=v_legacy_qp
    AND display_ref LIKE '9618/11/M/J/26 Q%';

  IF EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.source_paper_id=v_legacy_qp
      AND q.display_ref NOT LIKE 'LEGACY/9618/11/M/J/26 Q%'
  ) THEN
    RAISE EXCEPTION 'legacy_2026_display_ref_rewrite_incomplete';
  END IF;
END $$;
