-- Precompute the expensive, class-syllabus-specific Live Challenge readiness gate.
--
-- Runtime Live selection previously re-evaluated mark-scheme, taxonomy/LO,
-- source-fidelity/visual and required-dependency readiness on every teacher
-- filter change. This read model keeps those checks authoritative while making
-- the common read path indexable. If any source table changes, a revision
-- marker makes the cache stale; the application then safely falls back to the
-- legacy dynamic gate until this cache is refreshed.

CREATE TABLE public.live_question_readiness_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  corpus_revision bigint NOT NULL DEFAULT 1 CHECK (corpus_revision > 0),
  cache_revision bigint NOT NULL DEFAULT 0 CHECK (cache_revision >= 0),
  refreshed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.live_question_readiness_state(singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE public.live_question_readiness (
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  target_syllabus_id uuid NOT NULL REFERENCES public.syllabi(id) ON DELETE CASCADE,
  syllabus_code text NOT NULL,
  question_approved boolean NOT NULL,
  mark_scheme_ready boolean NOT NULL,
  response_levels_ready boolean NOT NULL,
  analytics_ready boolean NOT NULL,
  validation_ready boolean NOT NULL,
  visual_ready boolean NOT NULL,
  dependency_ready boolean NOT NULL DEFAULT true,
  has_visual boolean NOT NULL DEFAULT false,
  base_ready boolean NOT NULL,
  live_ready boolean NOT NULL,
  blocker_codes text[] NOT NULL DEFAULT '{}'::text[],
  readiness_version int NOT NULL DEFAULT 1 CHECK (readiness_version = 1),
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, target_syllabus_id)
);

CREATE INDEX live_question_readiness_target_ready_idx
  ON public.live_question_readiness(target_syllabus_id, live_ready, question_id);

CREATE INDEX live_question_readiness_code_ready_idx
  ON public.live_question_readiness(syllabus_code, live_ready, question_id);

CREATE INDEX live_question_readiness_blockers_gin_idx
  ON public.live_question_readiness USING gin(blocker_codes);

ALTER TABLE public.live_question_readiness_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_question_readiness ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_question_readiness_state, public.live_question_readiness
  FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.live_question_has_blocking_finding_v1(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  WITH RECURSIVE source_chain(id,parent_id) AS (
    SELECT q.id,q.parent_id
    FROM public.questions q
    WHERE q.id=p_question_id
    UNION
    SELECT parent.id,parent.parent_id
    FROM source_chain child
    JOIN public.questions parent ON parent.id=child.parent_id
  )
  SELECT EXISTS(
    SELECT 1
    FROM source_chain chain
    JOIN public.validation_findings vf
      ON vf.ref_table='questions'
     AND vf.ref_id=chain.id
     AND vf.resolved_at IS NULL
     AND vf.severity='error'
  )
$function$;

CREATE OR REPLACE FUNCTION public.live_question_has_visual_v1(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  WITH RECURSIVE source_chain(id,parent_id) AS (
    SELECT q.id,q.parent_id
    FROM public.questions q
    WHERE q.id=p_question_id
    UNION
    SELECT parent.id,parent.parent_id
    FROM source_chain child
    JOIN public.questions parent ON parent.id=child.parent_id
  )
  SELECT EXISTS(
    SELECT 1
    FROM source_chain chain
    JOIN public.question_assets qa ON qa.question_id=chain.id
    WHERE qa.kind IN ('diagram','image')
  )
$function$;

CREATE OR REPLACE FUNCTION public.live_question_visual_ready_v1(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  WITH RECURSIVE source_chain(id,parent_id,content_version,content_json) AS (
    SELECT q.id,q.parent_id,q.content_version,q.content_json
    FROM public.questions q
    WHERE q.id=p_question_id
    UNION
    SELECT parent.id,parent.parent_id,parent.content_version,parent.content_json
    FROM source_chain child
    JOIN public.questions parent ON parent.id=child.parent_id
  )
  SELECT NOT EXISTS(
    SELECT 1
    FROM source_chain source_node
    WHERE (
      source_node.content_version=1
      AND source_node.content_json IS NOT NULL
      AND EXISTS(
        SELECT 1
        FROM jsonb_array_elements(coalesce(source_node.content_json->'blocks','[]'::jsonb)) block
        LEFT JOIN public.question_assets qa ON qa.id::text=block->>'assetId'
        WHERE block->>'type'='asset'
          AND block->>'kind' IN ('diagram','image','flowchart','logic_circuit')
          AND (
            qa.id IS NULL
            OR (
              qa.kind IN ('diagram','image')
              AND NOT (
                nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
                OR coalesce(qa.content_md,'') ~* '^[[:space:]]*`{3}(svg|xml)[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
                OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
              )
            )
          )
      )
    ) OR (
      (source_node.content_json IS NULL OR source_node.content_version IS DISTINCT FROM 1)
      AND EXISTS(
        SELECT 1 FROM public.question_assets visual
        WHERE visual.question_id=source_node.id
          AND visual.kind IN ('diagram','image')
      )
      AND NOT EXISTS(
        SELECT 1 FROM public.question_assets qa
        WHERE qa.question_id=source_node.id
          AND qa.kind IN ('diagram','image')
          AND (
            nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
            OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
            OR coalesce(qa.content_md,'') ~* '^[[:space:]]*`{3}(svg|xml)[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
            OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
          )
      )
    )
  )
  AND NOT public.live_question_has_blocking_finding_v1(p_question_id)
$function$;

CREATE OR REPLACE FUNCTION public.live_question_dependency_ready_v1(
  p_question_id uuid,
  p_target_syllabus_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  WITH RECURSIVE closure(question_id) AS (
    SELECT p_question_id
    UNION
    SELECT qd.depends_on_id
    FROM closure c
    JOIN public.question_dependencies qd ON qd.question_id=c.question_id
    WHERE qd.strength::text='required'
  )
  SELECT NOT EXISTS(
    SELECT 1
    FROM closure c
    WHERE c.question_id<>p_question_id
      AND NOT EXISTS(
        SELECT 1
        FROM public.live_question_readiness r
        WHERE r.question_id=c.question_id
          AND r.target_syllabus_id=p_target_syllabus_id
          AND r.base_ready
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.refresh_live_question_readiness_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  current_revision bigint;
  inserted_rows int := 0;
  ready_rows int := 0;
BEGIN
  -- One refresher at a time. Readers can continue using the previous cache
  -- until this transaction commits.
  PERFORM pg_advisory_xact_lock(hashtext('live_question_readiness_v1'));

  SELECT corpus_revision
    INTO current_revision
  FROM public.live_question_readiness_state
  WHERE singleton=true
  FOR UPDATE;

  CREATE TEMP TABLE _live_question_readiness_v1
  (LIKE public.live_question_readiness INCLUDING DEFAULTS)
  ON COMMIT DROP;

  INSERT INTO _live_question_readiness_v1(
    question_id,target_syllabus_id,syllabus_code,
    question_approved,mark_scheme_ready,response_levels_ready,
    analytics_ready,validation_ready,visual_ready,dependency_ready,
    has_visual,base_ready,live_ready,blocker_codes,readiness_version,computed_at
  )
  SELECT
    q.id,
    target_syllabus.id,
    target_syllabus.code,
    gate.question_approved,
    gate.mark_scheme_ready,
    gate.response_levels_ready,
    gate.analytics_ready,
    gate.validation_ready,
    gate.visual_ready,
    true,
    gate.has_visual,
    gate.question_approved
      AND gate.mark_scheme_ready
      AND gate.response_levels_ready
      AND gate.analytics_ready
      AND gate.validation_ready
      AND gate.visual_ready,
    gate.question_approved
      AND gate.mark_scheme_ready
      AND gate.response_levels_ready
      AND gate.analytics_ready
      AND gate.validation_ready
      AND gate.visual_ready,
    array_remove(ARRAY[
      CASE WHEN NOT gate.question_approved THEN 'question_not_approved' END,
      CASE WHEN NOT gate.mark_scheme_ready THEN 'mark_scheme_not_ready' END,
      CASE WHEN NOT gate.response_levels_ready THEN 'response_levels_not_ready' END,
      CASE WHEN NOT gate.analytics_ready THEN 'analytics_mapping_not_ready' END,
      CASE WHEN NOT gate.validation_ready THEN 'source_validation_blocked' END,
      CASE WHEN NOT gate.visual_ready THEN 'visual_not_ready' END
    ]::text[],NULL),
    1,
    now()
  FROM public.questions q
  JOIN public.source_papers source_paper
    ON source_paper.id=q.source_paper_id
   AND source_paper.kind='QP'
  JOIN public.syllabi source_syllabus ON source_syllabus.id=source_paper.syllabus_id
  JOIN public.syllabi target_syllabus ON target_syllabus.code=source_syllabus.code
  CROSS JOIN LATERAL (
    SELECT
      (q.status='approved' AND coalesce(q.marks,0)>0) question_approved,
      EXISTS(
        SELECT 1
        FROM public.canonical_mark_schemes ms
        WHERE ms.question_id=q.id AND ms.status='approved'
      ) mark_scheme_ready,
      EXISTS(
        SELECT 1
        FROM public.canonical_mark_schemes ms
        WHERE ms.question_id=q.id
          AND ms.status='approved'
          AND (
            ms.scheme_type <> 'levels_of_response'::scheme_type
            OR EXISTS(
              SELECT 1 FROM public.mark_scheme_levels msl
              WHERE msl.mark_scheme_id=ms.id
            )
          )
      ) response_levels_ready,
      EXISTS(
        SELECT 1
        WHERE
          EXISTS(
            SELECT 1
            FROM public.question_learning_objectives qlo
            JOIN public.learning_objectives direct_lo ON direct_lo.id=qlo.lo_id
            JOIN public.subtopics direct_st ON direct_st.id=direct_lo.subtopic_id
            JOIN public.topics direct_t ON direct_t.id=direct_st.topic_id
            WHERE qlo.question_id=q.id
              AND direct_t.syllabus_id=target_syllabus.id
          )
          OR EXISTS(
            SELECT 1
            FROM public.question_learning_objectives qlo
            JOIN public.learning_objective_compatibility compat
              ON compat.source_lo_id=qlo.lo_id
             AND compat.relation IN ('equivalent','subtopic_compatible')
            JOIN public.learning_objectives target_lo ON target_lo.id=compat.target_lo_id
            JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
            JOIN public.topics target_t ON target_t.id=target_st.topic_id
            WHERE qlo.question_id=q.id
              AND target_t.syllabus_id=target_syllabus.id
          )
          OR EXISTS(
            SELECT 1
            FROM public.question_subtopics qst
            JOIN public.subtopics source_st ON source_st.id=qst.subtopic_id
            JOIN public.topics source_t ON source_t.id=source_st.topic_id
            JOIN public.topics target_t
              ON target_t.syllabus_id=target_syllabus.id
             AND target_t.number=source_t.number
            JOIN public.subtopics target_st
              ON target_st.topic_id=target_t.id
             AND target_st.code=source_st.code
            WHERE qst.question_id=q.id
              AND qst.is_primary
              AND coalesce(qst.confidence,0)>=0.95
          )
      ) analytics_ready,
      NOT public.live_question_has_blocking_finding_v1(q.id) validation_ready,
      public.live_question_visual_ready_v1(q.id) visual_ready,
      public.live_question_has_visual_v1(q.id) has_visual
  ) gate;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;

  -- Dependency closure is evaluated only after all base rows exist in the
  -- temporary cache. Temporarily swap the base rows into the authoritative
  -- table inside this transaction so the helper can resolve required targets.
  DELETE FROM public.live_question_readiness;
  INSERT INTO public.live_question_readiness
  SELECT * FROM _live_question_readiness_v1;

  UPDATE public.live_question_readiness r
  SET dependency_ready=dep.ready,
      live_ready=r.base_ready AND dep.ready,
      blocker_codes=CASE
        WHEN dep.ready THEN r.blocker_codes
        ELSE array_append(r.blocker_codes,'required_dependency_not_ready')
      END
  FROM LATERAL (
    SELECT public.live_question_dependency_ready_v1(
      r.question_id,r.target_syllabus_id
    ) ready
  ) dep;

  SELECT count(*)::int
    INTO ready_rows
  FROM public.live_question_readiness
  WHERE live_ready;

  UPDATE public.live_question_readiness_state
  SET cache_revision=current_revision,
      refreshed_at=now(),
      updated_at=now()
  WHERE singleton=true;

  RETURN jsonb_build_object(
    'version',1,
    'corpusRevision',current_revision,
    'rows',inserted_rows,
    'liveReadyRows',ready_rows
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.mark_live_question_readiness_stale_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.live_question_readiness_state
  SET corpus_revision=corpus_revision+1,
      updated_at=now()
  WHERE singleton=true;
  RETURN NULL;
END
$function$;

-- Statement-level invalidation keeps bulk ingestion cheap: one revision bump per
-- mutating statement, not one write per imported question.
DO $triggers$
DECLARE
  table_name text;
  trigger_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'questions',
    'question_assets',
    'mark_schemes',
    'mark_scheme_levels',
    'mark_scheme_source_audits',
    'question_subtopics',
    'question_learning_objectives',
    'learning_objective_compatibility',
    'question_dependencies',
    'validation_findings',
    'source_papers',
    'syllabi',
    'topics',
    'subtopics'
  ]
  LOOP
    trigger_name := 'live_readiness_stale_' || table_name;
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',trigger_name,table_name);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.mark_live_question_readiness_stale_v1()',
      trigger_name,table_name
    );
  END LOOP;
END
$triggers$;

REVOKE ALL ON FUNCTION public.refresh_live_question_readiness_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_live_question_readiness_v1() TO service_role;

-- Build the first cache from the production corpus. Subsequent source edits
-- only mark it stale; readers can fail over to the dynamic gate until an
-- explicit refresh completes.
SELECT public.refresh_live_question_readiness_v1();

COMMENT ON TABLE public.live_question_readiness IS
  'Server-only precomputed Live Challenge readiness by question and target syllabus. Use only when cache_revision=corpus_revision; otherwise fall back to dynamic validation.';
COMMENT ON TABLE public.live_question_readiness_state IS
  'Revision guard for the Live readiness cache. Source-table mutations advance corpus_revision; a successful refresh advances cache_revision.';
