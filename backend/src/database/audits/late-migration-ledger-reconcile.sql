-- One-time production reconciliation for repository migrations 0127..0143.
--
-- Production reached these final states through controlled direct SQL / Supabase
-- migration operations while the application-owned public.schema_migrations ledger
-- remained at 0126_source_dependency_approval_gate.sql. The normal application
-- migration runner would therefore try to replay already-realized migrations.
--
-- IMPORTANT:
-- - this script does NOT replay migration DDL/DML;
-- - it proves each late migration's durable postcondition first;
-- - it acquires the same advisory-lock key used by migrate.ts;
-- - only after every postcondition passes does it baseline the exact filenames;
-- - any failed check aborts the transaction and leaves the ledger unchanged.

BEGIN;

SELECT pg_advisory_xact_lock(hashtext('campath_schema_migrations'));

DO $$
DECLARE
  v_failed text[];
  v_release jsonb;
  v_missing_ledger integer;
BEGIN
  IF to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'late ledger reconciliation blocked: public.schema_migrations is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE name='0126_source_dependency_approval_gate.sql'
  ) THEN
    RAISE EXCEPTION 'late ledger reconciliation blocked: expected 0126 baseline is absent';
  END IF;

  -- Do not baseline on top of an unexpected future application migration state.
  SELECT count(*) INTO v_missing_ledger
  FROM public.schema_migrations
  WHERE name ~ '^[0-9]{4}_'
    AND substring(name from 1 for 4)::integer > 143;
  IF v_missing_ledger<>0 THEN
    RAISE EXCEPTION 'late ledger reconciliation blocked: ledger already contains % migration(s) newer than 0143',v_missing_ledger;
  END IF;

  -- The strict current release gate must still be green before baselining history.
  SELECT public.assert_source_verified_year_v1('9618',2026) INTO v_release;
  IF coalesce((v_release->>'verified')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'late ledger reconciliation blocked: 9618/2026 release gate is not verified: %',v_release;
  END IF;

  WITH checks(name,ok) AS (
    SELECT '0127_legacy_2026_question_display_refs.sql',
      NOT EXISTS (
        SELECT 1
        FROM public.source_papers sp
        JOIN public.syllabi s ON s.id=sp.syllabus_id
        JOIN public.components c ON c.id=sp.component_id
        JOIN public.questions q ON q.source_paper_id=sp.id
        WHERE s.code='9618'
          AND c.number=1
          AND sp.kind='QP'::paper_kind
          AND sp.year=2026
          AND sp.series='MJ'::exam_series
          AND sp.variant=0
          AND sp.storage_path='legacy/manual/phase-0-qp.pdf'
          AND q.display_ref LIKE '9618/11/M/J/26 Q%'
      )

    UNION ALL
    SELECT '0128_source_fidelity_detector_v2.sql',
      to_regprocedure('public.flag_source_fidelity_requirements_v2(text,integer)') IS NOT NULL
      AND to_regprocedure('public.flag_source_fidelity_requirements_v1(text,integer)') IS NOT NULL
      AND coalesce(
        pg_get_functiondef(to_regprocedure('public.flag_source_fidelity_requirements_v1(text,integer)'))
          LIKE '%flag_source_fidelity_requirements_v2%',
        false
      )

    UNION ALL
    SELECT '0129_source_fidelity_review_state_guard.sql',
      to_regprocedure('public.mark_source_fidelity_demotion_v1()') IS NOT NULL
      AND to_regprocedure('public.repair_question_source_fidelity_guarded_v3(uuid,uuid,text,jsonb,jsonb,text[],boolean)') IS NOT NULL
      AND to_regprocedure('public.apply_source_structure_repair_manifest_v2(jsonb)') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname='trg_mark_source_fidelity_demotion_v1' AND NOT tgisinternal
      )

    UNION ALL
    SELECT '0130_sync_repaired_source_assets.sql',
      to_regprocedure('public.sync_repaired_source_assets_v1(text,integer,integer)') IS NOT NULL

    UNION ALL
    SELECT '0131_future_source_dependency_reconciliation.sql',
      to_regprocedure('public.reconcile_source_question_dependencies_v1(text,integer)') IS NOT NULL

    UNION ALL
    SELECT '0132_practical_dependency_reconciliation_v2.sql',
      to_regprocedure('public.reconcile_source_question_dependencies_v1(text,integer)') IS NOT NULL
      AND coalesce(
        pg_get_functiondef(to_regprocedure('public.reconcile_source_question_dependencies_v1(text,integer)'))
          LIKE '%source-dependency-reconcile-v2%',
        false
      )

    UNION ALL
    SELECT '0133_lesson_source_lo_compatibility_completion.sql',
      (
        SELECT count(*)
        FROM public.learning_objectives lo
        JOIN public.subtopics st ON st.id=lo.subtopic_id
        JOIN public.topics t ON t.id=st.topic_id
        JOIN public.syllabi s ON s.id=t.syllabus_id
        WHERE s.code='9618'
          AND s.version_label='2026-2028'
          AND st.code IN ('1.1','1.2','1.3','13.1','13.2','13.3')
      )=29
      AND (
        SELECT count(DISTINCT lo.id)
        FROM public.learning_objectives lo
        JOIN public.subtopics st ON st.id=lo.subtopic_id
        JOIN public.topics t ON t.id=st.topic_id
        JOIN public.syllabi s ON s.id=t.syllabus_id
        JOIN public.learning_objective_compatibility c
          ON c.target_lo_id=lo.id
         AND c.relation IN ('equivalent','subtopic_compatible')
        WHERE s.code='9618'
          AND s.version_label='2026-2028'
          AND st.code IN ('1.1','1.2','1.3','13.1','13.2','13.3')
      )=29
      AND (
        SELECT count(DISTINCT lo.id)
        FROM public.learning_objectives lo
        JOIN public.subtopics st ON st.id=lo.subtopic_id
        JOIN public.topics t ON t.id=st.topic_id
        JOIN public.syllabi s ON s.id=t.syllabus_id
        JOIN public.learning_objective_compatibility c
          ON c.target_lo_id=lo.id
         AND c.relation IN ('equivalent','subtopic_compatible')
        WHERE s.code='0478'
          AND s.version_label='2026-2028'
          AND st.code='7'
          AND lo.code LIKE '7-lo-%'
      )=9

    UNION ALL
    SELECT '0134_9618_historical_ms_source_audit_v3.sql',
      to_regprocedure('public.ms_source_audit_bootstrap_v3()') IS NOT NULL
      AND to_regprocedure('public.ms_source_audit_promote_verified_v3()') IS NOT NULL
      AND to_regprocedure('public.approve_source_verified_historical_questions_v1()') IS NOT NULL

    UNION ALL
    SELECT '0135_9618_ms_source_audit_pagination.sql',
      to_regprocedure('public.ms_source_audit_index_v4()') IS NOT NULL
      AND to_regprocedure('public.ms_source_audit_batch_v4(uuid[])') IS NOT NULL

    UNION ALL
    SELECT '0135_ms_source_audit_bootstrap_perf_and_sha_repair.sql',
      to_regclass('public.mark_scheme_groups_mark_scheme_id_idx') IS NOT NULL
      AND to_regclass('public.mark_scheme_levels_mark_scheme_id_idx') IS NOT NULL
      AND to_regclass('public.validation_findings_open_ref_idx') IS NOT NULL
      AND to_regclass('public.assignment_questions_question_id_idx') IS NOT NULL
      AND to_regclass('public.answers_question_id_idx') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.source_papers
        WHERE id='75a12934-1fa7-4ae3-b7e2-a4ce1f2291e5'::uuid
          AND lower(sha256)='9955c377d09a08b7def28b097d0f1a2247d7097b30d59b525eaf73805055898c'
      )
      AND EXISTS (
        SELECT 1 FROM public.source_papers
        WHERE id='4a0211e7-17f0-4fec-b75b-2e1b3dc72e44'::uuid
          AND lower(sha256)='e42d1cc9bdc1e41f9c08fa51f98bdc024d3a0b2984c98b50742f810a6c6762fd'
      )

    UNION ALL
    SELECT '0136_refresh_2023_mj12_ms_source_sha.sql',
      EXISTS (
        SELECT 1 FROM public.source_papers
        WHERE id='5002d9b1-b7aa-468f-b753-66e4e5252b14'::uuid
          AND lower(sha256)='bc0db739175ead33ca2acb9af7fc46cdc2f8153a05ac867b943ccb1ad09f5a2c'
      )

    UNION ALL
    SELECT '0137_9618_ms_source_matcher_v4.sql',
      to_regprocedure('public.ms_source_audit_promote_verified_v4()') IS NOT NULL

    UNION ALL
    SELECT '0138_9618_ms_source_matcher_v5.sql',
      to_regprocedure('public.ms_source_audit_promote_verified_v5()') IS NOT NULL

    UNION ALL
    SELECT '0139_9618_ms_source_point_repair_contract.sql',
      to_regclass('public.mark_scheme_point_source_repair_history') IS NOT NULL
      AND to_regprocedure('public.apply_ms_source_point_repair_v1(jsonb)') IS NOT NULL

    UNION ALL
    SELECT '0140_9618_ms_embedded_layout_repair_contract.sql',
      to_regprocedure('public.apply_ms_source_point_repair_v2(jsonb)') IS NOT NULL

    UNION ALL
    SELECT '0142_security_function_search_path.sql',
      (
        SELECT count(*)=3
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public'
          AND p.proname IN (
            'backfill_published_submissions_on_enrolment_v1',
            'enforce_user_identity_security_v1',
            'redact_user_purge_audit_v1'
          )
          AND p.proconfig @> ARRAY['search_path=public, pg_temp']::text[]
      )

    UNION ALL
    SELECT '0143_fk_workload_indexes.sql',
      (
        SELECT count(*)=9
        FROM pg_class idx
        JOIN pg_index pi ON pi.indexrelid=idx.oid
        JOIN pg_namespace n ON n.oid=idx.relnamespace
        WHERE n.nspname='public'
          AND idx.relname IN (
            'questions_component_id_idx',
            'question_assets_question_id_idx',
            'question_subtopics_subtopic_id_idx',
            'question_learning_objectives_lo_id_idx',
            'mark_scheme_points_group_id_idx',
            'mark_schemes_source_paper_id_idx',
            'mark_scheme_source_audits_source_paper_id_idx',
            'question_source_repair_history_source_paper_id_idx',
            'structured_content_backfill_audits_source_paper_id_idx'
          )
          AND pi.indisvalid
          AND pi.indisready
      )
  )
  SELECT array_agg(name ORDER BY name)
  INTO v_failed
  FROM checks
  WHERE ok IS DISTINCT FROM true;

  IF v_failed IS NOT NULL THEN
    RAISE EXCEPTION 'late ledger reconciliation blocked: migration postconditions failed for %',v_failed;
  END IF;
END $$;

WITH baseline(name) AS (VALUES
  ('0127_legacy_2026_question_display_refs.sql'),
  ('0128_source_fidelity_detector_v2.sql'),
  ('0129_source_fidelity_review_state_guard.sql'),
  ('0130_sync_repaired_source_assets.sql'),
  ('0131_future_source_dependency_reconciliation.sql'),
  ('0132_practical_dependency_reconciliation_v2.sql'),
  ('0133_lesson_source_lo_compatibility_completion.sql'),
  ('0134_9618_historical_ms_source_audit_v3.sql'),
  ('0135_9618_ms_source_audit_pagination.sql'),
  ('0135_ms_source_audit_bootstrap_perf_and_sha_repair.sql'),
  ('0136_refresh_2023_mj12_ms_source_sha.sql'),
  ('0137_9618_ms_source_matcher_v4.sql'),
  ('0138_9618_ms_source_matcher_v5.sql'),
  ('0139_9618_ms_source_point_repair_contract.sql'),
  ('0140_9618_ms_embedded_layout_repair_contract.sql'),
  ('0142_security_function_search_path.sql'),
  ('0143_fk_workload_indexes.sql')
)
INSERT INTO public.schema_migrations(name)
SELECT name FROM baseline
ON CONFLICT(name) DO NOTHING;

DO $$
DECLARE
  v_missing text[];
BEGIN
  WITH expected(name) AS (VALUES
    ('0127_legacy_2026_question_display_refs.sql'),
    ('0128_source_fidelity_detector_v2.sql'),
    ('0129_source_fidelity_review_state_guard.sql'),
    ('0130_sync_repaired_source_assets.sql'),
    ('0131_future_source_dependency_reconciliation.sql'),
    ('0132_practical_dependency_reconciliation_v2.sql'),
    ('0133_lesson_source_lo_compatibility_completion.sql'),
    ('0134_9618_historical_ms_source_audit_v3.sql'),
    ('0135_9618_ms_source_audit_pagination.sql'),
    ('0135_ms_source_audit_bootstrap_perf_and_sha_repair.sql'),
    ('0136_refresh_2023_mj12_ms_source_sha.sql'),
    ('0137_9618_ms_source_matcher_v4.sql'),
    ('0138_9618_ms_source_matcher_v5.sql'),
    ('0139_9618_ms_source_point_repair_contract.sql'),
    ('0140_9618_ms_embedded_layout_repair_contract.sql'),
    ('0142_security_function_search_path.sql'),
    ('0143_fk_workload_indexes.sql')
  )
  SELECT array_agg(e.name ORDER BY e.name)
  INTO v_missing
  FROM expected e
  WHERE NOT EXISTS (
    SELECT 1 FROM public.schema_migrations sm WHERE sm.name=e.name
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'late ledger reconciliation incomplete: expected rows missing after baseline: %',v_missing;
  END IF;
END $$;

COMMIT;
