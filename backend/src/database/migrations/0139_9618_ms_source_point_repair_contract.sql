-- Guarded, source-audit-bound repair contract for historical Cambridge 9618 MS point text.
--
-- This contract does not invent or paraphrase mark-scheme content. A caller may
-- only remove proven PDF-layout artefacts from a canonical mark point when the
-- current matcher-v5 audit ties that exact point mismatch to the exact pinned MS
-- SHA and source section. The mark scheme remains needs_review after repair and
-- must pass a fresh source audit before any later approval.

CREATE TABLE IF NOT EXISTS public.mark_scheme_point_source_repair_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_scheme_id uuid NOT NULL REFERENCES public.mark_schemes(id) ON DELETE CASCADE,
  point_id uuid NOT NULL REFERENCES public.mark_scheme_points(id) ON DELETE CASCADE,
  source_paper_id uuid NOT NULL REFERENCES public.source_papers(id),
  source_sha256 text NOT NULL,
  source_page integer NOT NULL CHECK (source_page > 0),
  source_section_hash text NOT NULL,
  audit_version text NOT NULL,
  matcher_version text NOT NULL,
  proof_mode text NOT NULL,
  proof jsonb NOT NULL DEFAULT '{}'::jsonb,
  old_text text NOT NULL,
  new_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mark_scheme_point_source_repair_history_point_idx
  ON public.mark_scheme_point_source_repair_history(point_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_ms_source_point_repair_v1(p_manifest jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_source_paper_id uuid;
  v_source_sha text;
  v_actual_sha text;
  v_source_year integer;
  v_source_kind text;
  v_syllabus_code text;
  v_rows jsonb;
  v_row jsonb;
  v_point_id uuid;
  v_mark_scheme_id uuid;
  v_point_code text;
  v_current_text text;
  v_old_text text;
  v_new_text text;
  v_mismatch_detail text;
  v_proof_mode text;
  v_source_page integer;
  v_section_hash text;
  v_audit_page integer;
  v_audit_evidence jsonb;
  v_question_id uuid;
  v_scheme_type text;
  v_scheme_status text;
  v_question_status text;
  v_applied integer := 0;
  v_replayed integer := 0;
  v_touched_schemes uuid[] := ARRAY[]::uuid[];
BEGIN
  IF p_manifest IS NULL OR jsonb_typeof(p_manifest)<>'object'
     OR p_manifest->>'version'<>'9618-ms-point-source-repair-v1' THEN
    RAISE EXCEPTION 'invalid 9618 MS point repair manifest' USING ERRCODE='22023';
  END IF;

  BEGIN
    v_source_paper_id := (p_manifest->>'sourcePaperId')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'invalid sourcePaperId' USING ERRCODE='22023';
  END;
  v_source_sha := lower(trim(coalesce(p_manifest->>'sourceSha256','')));
  v_rows := p_manifest->'rows';

  IF v_source_sha='' THEN
    RAISE EXCEPTION 'sourceSha256 is required' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(v_rows)<>'array' OR jsonb_array_length(v_rows)<1 OR jsonb_array_length(v_rows)>80 THEN
    RAISE EXCEPTION 'repair manifest rows must contain 1..80 entries' USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_rows) r
    GROUP BY r->>'markSchemeId',r->>'pointCode'
    HAVING count(*)>1
  ) THEN
    RAISE EXCEPTION 'duplicate markSchemeId/pointCode in repair manifest' USING ERRCODE='22023';
  END IF;

  SELECT lower(trim(coalesce(sp.sha256,''))),sp.year,sp.kind::text,s.code
  INTO v_actual_sha,v_source_year,v_source_kind,v_syllabus_code
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE sp.id=v_source_paper_id;

  IF NOT FOUND OR v_source_kind<>'MS' OR v_syllabus_code<>'9618'
     OR v_source_year NOT BETWEEN 2021 AND 2025
     OR v_actual_sha='' OR v_actual_sha<>v_source_sha THEN
    RAISE EXCEPTION 'repair manifest source identity/SHA gate failed' USING ERRCODE='22023';
  END IF;

  -- Validate the complete manifest before mutating any row. This keeps a
  -- multi-point scheme atomic and prevents an early update from invalidating a
  -- later row's audit precondition.
  FOR v_row IN SELECT value FROM jsonb_array_elements(v_rows)
  LOOP
    IF jsonb_typeof(v_row)<>'object' THEN
      RAISE EXCEPTION 'invalid repair row' USING ERRCODE='22023';
    END IF;

    BEGIN
      v_mark_scheme_id := (v_row->>'markSchemeId')::uuid;
      v_source_page := (v_row->>'sourcePage')::integer;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid repair row identifiers' USING ERRCODE='22023';
    END;

    v_point_code := coalesce(v_row->>'pointCode','');
    v_old_text := coalesce(v_row->>'expectedOldText','');
    v_new_text := coalesce(v_row->>'newText','');
    v_mismatch_detail := coalesce(v_row->>'mismatchDetail','');
    v_proof_mode := coalesce(v_row->>'proofMode','');
    v_section_hash := lower(trim(coalesce(v_row->>'sourceSectionHash','')));

    IF v_point_code='' OR v_old_text='' OR v_new_text='' OR v_mismatch_detail=''
       OR v_section_hash='' OR v_source_page<1 THEN
      RAISE EXCEPTION 'repair row required fields are missing' USING ERRCODE='22023';
    END IF;
    IF v_new_text<>trim(v_new_text) OR length(v_new_text)>8000
       OR length(v_new_text)>=length(v_old_text) THEN
      RAISE EXCEPTION 'repair row newText must be a shorter trimmed source-faithful value' USING ERRCODE='22023';
    END IF;
    IF v_proof_mode<>'exact_source_substring_after_path_mark_column_strip_v1' THEN
      RAISE EXCEPTION 'unsupported point repair proof mode' USING ERRCODE='22023';
    END IF;

    SELECT p.id,p.text,ms.question_id,ms.scheme_type::text,ms.status::text,q.status::text
    INTO v_point_id,v_current_text,v_question_id,v_scheme_type,v_scheme_status,v_question_status
    FROM public.mark_scheme_points p
    JOIN public.mark_schemes ms ON ms.id=p.mark_scheme_id
    JOIN public.questions q ON q.id=ms.question_id
    JOIN public.source_papers qp ON qp.id=q.source_paper_id AND qp.kind='QP'::paper_kind
    JOIN public.source_papers src ON src.id=ms.source_paper_id AND src.kind='MS'::paper_kind
    WHERE p.mark_scheme_id=v_mark_scheme_id
      AND p.code=v_point_code
      AND ms.source_paper_id=v_source_paper_id
      AND qp.syllabus_id=src.syllabus_id
      AND qp.year=src.year
      AND qp.series=src.series
      AND qp.component_id=src.component_id
      AND qp.variant=src.variant;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'repair row point/scheme/source identity mismatch' USING ERRCODE='22023';
    END IF;
    IF v_scheme_status<>'needs_review' OR v_question_status NOT IN ('approved','needs_review')
       OR v_scheme_type='manual_only' THEN
      RAISE EXCEPTION 'repair row review-state gate failed' USING ERRCODE='22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.assignment_questions aq WHERE aq.question_id=v_question_id)
       OR EXISTS (SELECT 1 FROM public.answers a WHERE a.question_id=v_question_id) THEN
      RAISE EXCEPTION 'repair row question is already in use' USING ERRCODE='22023';
    END IF;

    SELECT a.source_page,a.evidence
    INTO v_audit_page,v_audit_evidence
    FROM public.mark_scheme_source_audits a
    WHERE a.mark_scheme_id=v_mark_scheme_id
      AND a.audit_version='9618-ms-source-audit-v2'
      AND a.source_paper_id=v_source_paper_id
      AND lower(trim(a.source_sha256))=v_source_sha
      AND a.result='needs_review'
      AND a.evidence->>'matcherVersion'='9618-ms-source-matcher-v5'
    ORDER BY a.audited_at DESC
    LIMIT 1;

    IF NOT FOUND OR v_audit_page IS DISTINCT FROM v_source_page
       OR lower(coalesce(v_audit_evidence->>'sourceSectionHash',''))<>v_section_hash
       OR NOT EXISTS (
         SELECT 1
         FROM jsonb_array_elements(coalesce(v_audit_evidence->'reasons','[]'::jsonb)) r
         WHERE r->>'code'='rubric_source_text_mismatch'
           AND r->>'detail'=v_mismatch_detail
       ) THEN
      RAISE EXCEPTION 'repair row matcher-v5 audit proof gate failed' USING ERRCODE='22023';
    END IF;

    IF v_current_text=v_new_text THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.mark_scheme_point_source_repair_history h
        WHERE h.point_id=v_point_id
          AND h.source_paper_id=v_source_paper_id
          AND lower(h.source_sha256)=v_source_sha
          AND h.old_text=v_old_text AND h.new_text=v_new_text
          AND h.source_section_hash=v_section_hash
          AND h.proof_mode=v_proof_mode
      ) THEN
        RAISE EXCEPTION 'repair row current text changed without matching repair history' USING ERRCODE='22023';
      END IF;
    ELSIF v_current_text<>v_old_text THEN
      RAISE EXCEPTION 'repair row expectedOldText drifted' USING ERRCODE='22023';
    END IF;
  END LOOP;

  FOR v_row IN SELECT value FROM jsonb_array_elements(v_rows)
  LOOP
    v_mark_scheme_id := (v_row->>'markSchemeId')::uuid;
    v_point_code := v_row->>'pointCode';
    v_old_text := v_row->>'expectedOldText';
    v_new_text := v_row->>'newText';
    v_source_page := (v_row->>'sourcePage')::integer;
    v_section_hash := lower(trim(v_row->>'sourceSectionHash'));
    v_proof_mode := v_row->>'proofMode';

    SELECT id,text INTO v_point_id,v_current_text
    FROM public.mark_scheme_points
    WHERE mark_scheme_id=v_mark_scheme_id AND code=v_point_code
    FOR UPDATE;

    IF v_current_text=v_new_text THEN
      v_replayed := v_replayed+1;
      CONTINUE;
    END IF;

    UPDATE public.mark_scheme_points
    SET text=v_new_text
    WHERE id=v_point_id AND text=v_old_text;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'repair row changed during apply' USING ERRCODE='40001';
    END IF;

    INSERT INTO public.mark_scheme_point_source_repair_history(
      mark_scheme_id,point_id,source_paper_id,source_sha256,source_page,
      source_section_hash,audit_version,matcher_version,proof_mode,proof,old_text,new_text
    ) VALUES (
      v_mark_scheme_id,v_point_id,v_source_paper_id,v_source_sha,v_source_page,
      v_section_hash,'9618-ms-source-audit-v2','9618-ms-source-matcher-v5',v_proof_mode,
      coalesce(v_row->'proof','{}'::jsonb),v_old_text,v_new_text
    );

    v_applied := v_applied+1;
    IF NOT v_mark_scheme_id=ANY(v_touched_schemes) THEN
      v_touched_schemes := array_append(v_touched_schemes,v_mark_scheme_id);
    END IF;
  END LOOP;

  IF cardinality(v_touched_schemes)>0 THEN
    UPDATE public.mark_schemes
    SET status='needs_review'::review_status,reviewed_at=NULL,reviewed_by=NULL,updated_at=now()
    WHERE id=ANY(v_touched_schemes);
  END IF;

  RETURN jsonb_build_object(
    'version','9618-ms-point-source-repair-v1',
    'sourcePaperId',v_source_paper_id,
    'sourceSha256',v_source_sha,
    'applied',v_applied,
    'replayed',v_replayed,
    'touchedSchemes',coalesce(array_length(v_touched_schemes,1),0)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_ms_source_point_repair_v1(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_ms_source_point_repair_v1(jsonb) TO service_role;
