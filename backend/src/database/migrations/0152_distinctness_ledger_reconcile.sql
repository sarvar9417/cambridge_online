-- Reconcile the application migration ledger after the source-verified
-- distinctness decisions were realized in production through a guarded Supabase
-- migration. Prove durable postconditions before baselining the repository file.

DO $$
DECLARE
  v_verified_reviews integer;
  v_unreviewed integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('campath_schema_migrations'));

  IF to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'distinctness ledger reconcile: schema_migrations missing';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.schema_migrations
    WHERE name='0150_canonical_occurrence_ledger_reconcile.sql'
  ) THEN
    RAISE EXCEPTION 'distinctness ledger reconcile: 0150 baseline missing';
  END IF;
  IF to_regclass('public.source_paper_distinctness_reviews') IS NULL THEN
    RAISE EXCEPTION 'distinctness ledger reconcile: review relation missing';
  END IF;

  SELECT count(*) INTO v_verified_reviews
  FROM public.source_paper_distinctness_reviews r
  JOIN public.source_papers a ON a.id=r.paper_a_id
  JOIN public.source_papers b ON b.id=r.paper_b_id
  JOIN public.syllabi s ON s.id=a.syllabus_id
  WHERE s.code='9618'
    AND a.kind='QP'::paper_kind AND b.kind='QP'::paper_kind
    AND r.result='distinct_content'
    AND coalesce((r.evidence->>'sourceVerified')::boolean,false);

  WITH p AS (
    SELECT sp.id,s.code syllabus,c.number component,sp.year,sp.series::text series,sp.variant,
           count(q.id)::int nodes,
           count(q.id) FILTER(WHERE q.marks IS NOT NULL)::int leaves,
           coalesce(sum(q.marks) FILTER(WHERE q.marks IS NOT NULL),0)::int marks
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    JOIN public.questions q ON q.source_paper_id=sp.id
    WHERE s.code='9618' AND sp.kind='QP'::paper_kind
      AND sp.source_url IS NOT NULL AND sp.variant BETWEEN 1 AND 3
    GROUP BY sp.id,s.code,c.number,sp.year,sp.series,sp.variant
  ), candidates AS (
    SELECT least(a.id,b.id) paper_a_id,greatest(a.id,b.id) paper_b_id
    FROM p a JOIN p b
      ON a.syllabus=b.syllabus AND a.component=b.component
     AND a.year=b.year AND a.series=b.series
     AND a.nodes=b.nodes AND a.leaves=b.leaves AND a.marks=b.marks
     AND a.variant<b.variant
  )
  SELECT count(*) INTO v_unreviewed
  FROM candidates x
  WHERE NOT EXISTS(
    SELECT 1 FROM public.source_paper_distinctness_reviews r
    WHERE r.paper_a_id=x.paper_a_id AND r.paper_b_id=x.paper_b_id
      AND r.result='distinct_content'
      AND coalesce((r.evidence->>'sourceVerified')::boolean,false)
  );

  IF v_verified_reviews<>4 OR v_unreviewed<>0 THEN
    RAISE EXCEPTION
      'distinctness ledger reconcile failed verified_reviews=% unreviewed=%',
      v_verified_reviews,v_unreviewed;
  END IF;

  INSERT INTO public.schema_migrations(name)
  VALUES('0151_source_variant_distinctness_reviews.sql')
  ON CONFLICT(name) DO NOTHING;

  IF NOT EXISTS(
    SELECT 1 FROM public.schema_migrations
    WHERE name='0151_source_variant_distinctness_reviews.sql'
  ) THEN
    RAISE EXCEPTION 'distinctness ledger reconcile: 0151 ledger row missing';
  END IF;
END $$;
