-- 0189_reconcile_9618_2021_mj11_stale_validation_warning.sql
-- Resolve the historical MANUAL-DURABLE-REPAIR warning only after the current
-- 9618/11/M/J/21 source-backed corpus satisfies the durable release contract.
--
-- This does not alter question, mark-scheme, taxonomy, LaTeX, structured
-- content, source identity, assets or dependencies.

DO $$
DECLARE
  v_qp uuid;
  v_finding uuid;
  v_leaves int;
  v_approved int;
  v_marks int;
  v_latex int;
  v_structured int;
  v_low_primary int;
  v_low_lo int;
  v_bad_ms int;
BEGIN
  SELECT sp.id INTO v_qp
  FROM public.source_papers sp
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE sy.code='9618'
    AND c.number=1
    AND sp.kind='QP'::paper_kind
    AND sp.year=2021
    AND sp.series='MJ'::exam_series
    AND sp.variant=1
    AND sp.sha256='d73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453'
    AND sp.page_count=16
    AND sp.source_url='https://drive.google.com/file/d/12vhfbT_LUMMUEU-aCHSQJ-O0S-OJVCRN/view?usp=drivesdk';

  IF v_qp IS NULL THEN
    RAISE EXCEPTION '0189 exact 9618/11/M/J/21 QP source gate failed';
  END IF;

  SELECT id INTO v_finding
  FROM public.validation_findings
  WHERE rule_code='MANUAL-DURABLE-REPAIR'
    AND ref_table='source_papers'
    AND ref_id=v_qp
    AND resolved_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_finding IS NULL THEN
    -- Idempotent on an already reconciled production ledger.
    IF NOT EXISTS (
      SELECT 1
      FROM public.validation_findings
      WHERE rule_code='MANUAL-DURABLE-REPAIR'
        AND ref_table='source_papers'
        AND ref_id=v_qp
        AND resolved_at IS NOT NULL
        AND resolution LIKE 'source-backed closure verified:%'
    ) THEN
      RAISE EXCEPTION '0189 expected unresolved or previously reconciled warning not found';
    END IF;
    RETURN;
  END IF;

  SELECT
    count(*) FILTER (WHERE q.marks IS NOT NULL),
    count(*) FILTER (WHERE q.marks IS NOT NULL AND q.status='approved'),
    coalesce(sum(q.marks) FILTER (WHERE q.marks IS NOT NULL),0),
    count(*) FILTER (
      WHERE q.marks IS NOT NULL
        AND q.body_format='latex'
        AND nullif(btrim(coalesce(q.stem_latex,'')),'') IS NOT NULL
    ),
    count(*) FILTER (
      WHERE q.marks IS NOT NULL
        AND q.content_json IS NOT NULL
        AND q.content_version=1
    ),
    count(*) FILTER (
      WHERE q.marks IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.question_subtopics qs
          WHERE qs.question_id=q.id AND qs.is_primary
            AND coalesce(qs.confidence,0)<0.95
        )
    ),
    count(*) FILTER (
      WHERE q.marks IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.question_learning_objectives qlo
          WHERE qlo.question_id=q.id AND coalesce(qlo.confidence,0)<0.95
        )
    )
  INTO v_leaves,v_approved,v_marks,v_latex,v_structured,v_low_primary,v_low_lo
  FROM public.questions q
  WHERE q.source_paper_id=v_qp;

  SELECT count(*) INTO v_bad_ms
  FROM public.questions q
  LEFT JOIN public.canonical_mark_schemes cms ON cms.question_id=q.id
  WHERE q.source_paper_id=v_qp
    AND q.marks IS NOT NULL
    AND (
      cms.id IS NULL
      OR cms.status<>'approved'
      OR cms.max_marks<>q.marks
      OR NOT EXISTS (
        SELECT 1 FROM public.mark_scheme_points p
        WHERE p.mark_scheme_id=cms.id
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.mark_scheme_source_audits a
        JOIN public.source_papers src ON src.id=cms.source_paper_id
        WHERE a.mark_scheme_id=cms.id
          AND a.source_paper_id=cms.source_paper_id
          AND a.source_sha256=src.sha256
          AND a.result='verified'
      )
    );

  IF v_leaves<>30 OR v_approved<>30 OR v_marks<>75
     OR v_latex<>30 OR v_structured<>30
     OR v_low_primary<>0 OR v_low_lo<>0 OR v_bad_ms<>0 THEN
    RAISE EXCEPTION
      '0189 release gate failed leaves=% approved=% marks=% latex=% structured=% low_primary=% low_lo=% bad_ms=%',
      v_leaves,v_approved,v_marks,v_latex,v_structured,v_low_primary,v_low_lo,v_bad_ms;
  END IF;

  UPDATE public.validation_findings
  SET resolved_at=now(),
      resolution=
        'source-backed closure verified: 30/30 approved scoring leaves, 75/75 marks, ' ||
        '30/30 LaTeX + structured v1, current canonical mark schemes verified, ' ||
        'taxonomy/LO confidence review closed; historical ingest warning no longer reflects current corpus state'
  WHERE id=v_finding;
END $$;

DO $$
DECLARE v_bad int;
BEGIN
  SELECT count(*) INTO v_bad
  FROM public.validation_findings vf
  JOIN public.source_papers sp ON sp.id=vf.ref_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE vf.rule_code='MANUAL-DURABLE-REPAIR'
    AND vf.ref_table='source_papers'
    AND sy.code='9618' AND c.number=1
    AND sp.year=2021 AND sp.series='MJ'::exam_series AND sp.variant=1
    AND vf.resolved_at IS NULL;

  IF v_bad<>0 THEN
    RAISE EXCEPTION '0189 stale validation warning remains unresolved: %',v_bad;
  END IF;
END $$;
