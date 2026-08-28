-- The 2026 M/J 11 rows created by backend/src/database/seed-questions.ts are
-- development/demo fixtures, not an official Cambridge source paper. Preserve
-- them for historical test assignments, but prevent them from appearing in the
-- staff Question Bank alongside the source-backed corpus.
DO $$
DECLARE v_source uuid; v_questions integer; v_live_refs integer;
BEGIN
  SELECT sp.id INTO v_source
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code='9618' AND sp.kind='QP'::paper_kind
    AND sp.storage_path='manual/phase-0-qp.pdf'
    AND sp.source_url IS NULL
    AND sp.sha256=encode(digest('campath-manual-phase-0-qp','sha256'),'hex')
    AND sp.year=2026 AND sp.series='MJ'::exam_series AND c.number=1 AND sp.variant=1;

  IF v_source IS NULL THEN
    -- A clean production database may never have had the demo seed. No-op.
    RETURN;
  END IF;

  SELECT count(*) INTO v_questions FROM public.questions WHERE source_paper_id=v_source;
  IF v_questions<>40 THEN
    RAISE EXCEPTION 'phase0_seed_shape_changed:%',v_questions;
  END IF;

  UPDATE public.questions
  SET status='archived'::review_status,updated_at=now(),
      notes=CASE WHEN coalesce(notes,'') ILIKE '%Phase 0 manual seed%' THEN notes ELSE concat_ws(E'\n',notes,'Phase 0 manual seed') END
  WHERE source_paper_id=v_source
    AND status<>'archived'::review_status;

  SELECT count(*) INTO v_live_refs
  FROM public.questions
  WHERE source_paper_id=v_source AND status IN ('approved'::review_status,'needs_review'::review_status);
  IF v_live_refs<>0 THEN RAISE EXCEPTION 'phase0_seed_archive_failed:%',v_live_refs; END IF;
END $$;
