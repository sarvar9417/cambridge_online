-- Reconcile application migration ledger after 0144..0149 were first realized
-- through guarded production operations/Supabase migrations.
--
-- This follows the same policy as late-migration-ledger-reconcile.sql: never mark a
-- filename applied merely because an external migration ledger says so. Prove the
-- durable postconditions first, then baseline only the exact repository filenames.

DO $$
DECLARE
  v_missing text[];
  v_physical_alias integer;
  v_bad_occurrence integer;
  v_mj24_p3_occurrences integer;
  v_bootstrap jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('campath_schema_migrations'));

  IF to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'canonical occurrence ledger reconcile: schema_migrations missing';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.schema_migrations WHERE name='0143_fk_workload_indexes.sql') THEN
    RAISE EXCEPTION 'canonical occurrence ledger reconcile: 0143 baseline missing';
  END IF;

  SELECT array_agg(name ORDER BY name) INTO v_missing
  FROM (VALUES
    ('source_paper_equivalences'),
    ('question_source_occurrences'),
    ('question_canonical_merge_audits')
  ) expected(name)
  WHERE to_regclass('public.'||expected.name) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'canonical occurrence ledger reconcile: missing relations %',v_missing;
  END IF;

  IF to_regprocedure('public.merge_verified_equivalent_source_paper_v1(text,integer,integer,text,integer,integer,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'canonical occurrence ledger reconcile: merge function missing';
  END IF;
  IF to_regprocedure('public.structured_content_backfill_bootstrap_v2(text,integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'canonical occurrence ledger reconcile: structured bootstrap v2 missing';
  END IF;

  SELECT count(*) INTO v_physical_alias
  FROM public.source_paper_equivalences e
  JOIN public.source_papers sp ON sp.id=e.source_paper_id AND sp.kind='QP'::paper_kind
  WHERE e.equivalence_kind='exact_content'
    AND EXISTS(SELECT 1 FROM public.questions q WHERE q.source_paper_id=e.source_paper_id);

  SELECT count(*) INTO v_bad_occurrence
  FROM public.question_source_occurrences o
  JOIN public.source_paper_equivalences e ON e.source_paper_id=o.source_paper_id
  JOIN public.source_papers sp ON sp.id=o.source_paper_id AND sp.kind='QP'::paper_kind
  WHERE e.equivalence_kind='exact_content'
    AND (o.is_primary OR o.equivalence_basis<>'source_verified_exact');

  SELECT count(*) INTO v_mj24_p3_occurrences
  FROM public.question_source_occurrences o
  JOIN public.source_papers sp ON sp.id=o.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code='9618' AND c.number=3 AND sp.year=2024
    AND sp.series='MJ'::exam_series AND sp.variant=3 AND sp.kind='QP'::paper_kind
    AND NOT o.is_primary AND o.equivalence_basis='source_verified_exact';

  v_bootstrap:=public.structured_content_backfill_bootstrap_v2('9618',2021,2024);

  IF v_physical_alias<>0 OR v_bad_occurrence<>0 OR v_mj24_p3_occurrences<>40
     OR coalesce((v_bootstrap->>'canonicalSourceMode')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION
      'canonical occurrence ledger reconcile failed physical_alias=% bad_occurrence=% mj24p3_occurrences=% bootstrap=%',
      v_physical_alias,v_bad_occurrence,v_mj24_p3_occurrences,v_bootstrap;
  END IF;

  INSERT INTO public.schema_migrations(name)
  SELECT name FROM (VALUES
    ('0144_question_occurrence_identity.sql'),
    ('0145_verified_source_canonical_merge.sql'),
    ('0146_fix_verified_source_merge_syllabus_resolution.sql'),
    ('0147_canonicalize_verified_9618_equivalent_variants.sql'),
    ('0148_canonicalize_2024_mj_p3_semantic_equivalence.sql'),
    ('0149_canonical_structured_backfill_bootstrap.sql')
  ) expected(name)
  ON CONFLICT(name) DO NOTHING;

  SELECT array_agg(expected.name ORDER BY expected.name) INTO v_missing
  FROM (VALUES
    ('0144_question_occurrence_identity.sql'),
    ('0145_verified_source_canonical_merge.sql'),
    ('0146_fix_verified_source_merge_syllabus_resolution.sql'),
    ('0147_canonicalize_verified_9618_equivalent_variants.sql'),
    ('0148_canonicalize_2024_mj_p3_semantic_equivalence.sql'),
    ('0149_canonical_structured_backfill_bootstrap.sql')
  ) expected(name)
  WHERE NOT EXISTS(SELECT 1 FROM public.schema_migrations sm WHERE sm.name=expected.name);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'canonical occurrence ledger reconcile incomplete: %',v_missing;
  END IF;
END $$;
