-- Guarded full-corpus source repair infrastructure for Cambridge 9618 QPs.
--
-- v3 deliberately reuses the proven row-level mutation gate from 0080 while
-- expanding the bootstrap from the historical 11-paper repair set to every
-- source-ready 2021-2025 9618 QP currently in production.
--
-- Hard corpus baseline at migration time:
--   118 official QPs / 2,985 marked leaves / 8,850 marks / 75 marks per paper.
--
-- The only known printed-path alias is 2023 M/J 9618/11: database path 6.a is
-- printed in the official paper as question 6 with no (a). The alias is exposed
-- to the parser; the internal database path remains unchanged.

CREATE OR REPLACE FUNCTION public.apply_qp_source_repair_manifest_v3(p_manifest jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_qp_id uuid;
  v_source_sha text;
  v_db_sha text;
  v_rows jsonb;
  v_enriched jsonb;
  v_manifest_leaves integer;
  v_manifest_marks integer;
  v_rows_count integer;
  v_rows_marks integer;
BEGIN
  IF jsonb_typeof(p_manifest) <> 'object' THEN
    RAISE EXCEPTION 'qp_repair_v3_manifest_not_object';
  END IF;
  IF p_manifest->>'parserVersion' IS DISTINCT FROM 'qp-source-repair-v3' THEN
    RAISE EXCEPTION 'qp_repair_v3_parser_version:%', p_manifest->>'parserVersion';
  END IF;

  BEGIN
    v_qp_id := (p_manifest->>'sourcePaperId')::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'qp_repair_v3_bad_source_paper_id';
  END;

  v_source_sha := nullif(trim(coalesce(p_manifest->>'sourceSha256','')), '');
  IF v_source_sha IS NULL THEN
    RAISE EXCEPTION 'qp_repair_v3_missing_source_sha';
  END IF;

  SELECT sp.sha256 INTO v_db_sha
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE sp.id=v_qp_id
    AND sp.kind='QP'::paper_kind
    AND s.code='9618';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'qp_repair_v3_qp_not_found';
  END IF;
  IF v_db_sha IS DISTINCT FROM v_source_sha THEN
    RAISE EXCEPTION 'qp_repair_v3_source_sha_mismatch:%:%', v_source_sha, v_db_sha;
  END IF;

  v_rows := p_manifest->'rows';
  IF jsonb_typeof(v_rows) <> 'array' OR jsonb_array_length(v_rows)=0 THEN
    RAISE EXCEPTION 'qp_repair_v3_rows_empty';
  END IF;

  v_manifest_leaves := coalesce((p_manifest->>'leaves')::integer, -1);
  v_manifest_marks := coalesce((p_manifest->>'marks')::integer, -1);
  SELECT count(*), coalesce(sum((x.value->>'marks')::integer),0)
  INTO v_rows_count, v_rows_marks
  FROM jsonb_array_elements(v_rows) x(value);

  IF v_manifest_leaves <> v_rows_count THEN
    RAISE EXCEPTION 'qp_repair_v3_leaf_metadata_mismatch:%:%', v_manifest_leaves, v_rows_count;
  END IF;
  IF v_manifest_marks <> v_rows_marks OR v_manifest_marks <> 75 THEN
    RAISE EXCEPTION 'qp_repair_v3_mark_metadata_mismatch:%:%', v_manifest_marks, v_rows_marks;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_rows) x(value)
    CROSS JOIN generate_series(1,31) g(n)
    WHERE g.n NOT IN (9,10,13)
      AND position(chr(g.n) in (coalesce(x.value->>'stem','') || coalesce(x.value->>'context',''))) > 0
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_rows) x(value)
    WHERE position(chr(127) in (coalesce(x.value->>'stem','') || coalesce(x.value->>'context',''))) > 0
  ) THEN
    RAISE EXCEPTION 'qp_repair_v3_control_character';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT x.value->>'path' AS path, count(*) AS n
      FROM jsonb_array_elements(v_rows) x(value)
      GROUP BY 1
      HAVING count(*) > 1
    ) d
  ) THEN
    RAISE EXCEPTION 'qp_repair_v3_duplicate_path';
  END IF;

  SELECT jsonb_agg(
    x.value || jsonb_build_object(
      'oldHash', md5(coalesce(q.stem_md,'') || chr(31) || coalesce(q.context_md,'') || chr(31) || coalesce(q.display_ref,''))
    )
    ORDER BY q.sort_order,q.id
  )
  INTO v_enriched
  FROM jsonb_array_elements(v_rows) x(value)
  JOIN public.questions q
    ON q.source_paper_id=v_qp_id
   AND q.path=x.value->>'path'
   AND q.marks=(x.value->>'marks')::integer;

  IF jsonb_array_length(coalesce(v_enriched,'[]'::jsonb)) <> v_rows_count THEN
    RAISE EXCEPTION 'qp_repair_v3_path_mark_join_mismatch';
  END IF;

  RETURN public.apply_qp_source_repair_v2(
    v_qp_id,
    v_enriched,
    v_source_sha,
    'source-backed-qp-source-repair-v3'
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.qp_source_repair_runner_bootstrap_v3()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_papers integer;
  v_leaves integer;
  v_marks integer;
  v_alias_count integer;
  v_result jsonb;
BEGIN
  SELECT
    count(*),
    coalesce(sum((SELECT count(*) FROM public.questions q WHERE q.source_paper_id=sp.id AND q.marks>0)),0)::integer,
    coalesce(sum((SELECT coalesce(sum(q.marks),0) FROM public.questions q WHERE q.source_paper_id=sp.id AND q.marks>0)),0)::integer
  INTO v_papers,v_leaves,v_marks
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.source_url IS NOT NULL
    AND nullif(trim(sp.sha256),'') IS NOT NULL;

  IF v_papers<>118 OR v_leaves<>2985 OR v_marks<>8850 THEN
    RAISE EXCEPTION 'qp_repair_v3_baseline_mismatch:%:%:%',v_papers,v_leaves,v_marks;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE s.code='9618'
      AND sp.kind='QP'::paper_kind
      AND sp.source_url IS NOT NULL
      AND nullif(trim(sp.sha256),'') IS NOT NULL
      AND (SELECT coalesce(sum(q.marks),0) FROM public.questions q WHERE q.source_paper_id=sp.id AND q.marks>0)<>75
  ) THEN
    RAISE EXCEPTION 'qp_repair_v3_non_75_paper';
  END IF;

  SELECT count(*) INTO v_alias_count
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND q.marks>0
    AND q.path LIKE '%.%'
    AND q.display_ref ~ ' Q[0-9]+$';

  IF v_alias_count<>1 OR NOT EXISTS (
    SELECT 1
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code='9618'
      AND sp.kind='QP'::paper_kind
      AND sp.year=2023
      AND sp.series='MJ'::exam_series
      AND c.number=1
      AND sp.variant=1
      AND q.path='6.a'
      AND q.marks=5
      AND q.display_ref='9618/11/M/J/23 Q6'
  ) THEN
    RAISE EXCEPTION 'qp_repair_v3_alias_baseline_mismatch:%',v_alias_count;
  END IF;

  SELECT jsonb_build_object(
    'parserVersion','qp-source-repair-v3',
    'paperCount',v_papers,
    'leafCount',v_leaves,
    'marks',v_marks,
    'sources',coalesce(
      jsonb_agg(
        src ORDER BY (src->>'year')::integer,src->>'series',(src->>'component')::integer,(src->>'variant')::integer
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',sp.id,
      'sourceUrl',sp.source_url,
      'sourceSha256',sp.sha256,
      'syllabusCode',s.code,
      'component',c.number,
      'variant',sp.variant,
      'series',sp.series,
      'year',sp.year,
      'expectedMarks',75,
      'aliases',CASE
        WHEN sp.year=2023 AND sp.series='MJ'::exam_series AND c.number=1 AND sp.variant=1
          THEN jsonb_build_object('6.a','6')
        ELSE '{}'::jsonb
      END,
      'leaves',(
        SELECT jsonb_agg(
          jsonb_build_object('path',q.path,'marks',q.marks)
          ORDER BY q.sort_order,q.id
        )
        FROM public.questions q
        WHERE q.source_paper_id=sp.id
          AND q.marks>0
      )
    ) AS src
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code='9618'
      AND sp.kind='QP'::paper_kind
      AND sp.source_url IS NOT NULL
      AND nullif(trim(sp.sha256),'') IS NOT NULL
  ) x;

  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.apply_qp_source_repair_manifest_v3(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.qp_source_repair_runner_bootstrap_v3() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_qp_source_repair_manifest_v3(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.qp_source_repair_runner_bootstrap_v3() TO service_role;
