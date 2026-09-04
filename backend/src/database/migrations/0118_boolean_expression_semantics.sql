-- Source-backed Boolean-expression semantic enrichment.
--
-- The earlier corpus repair preserved every printed expression faithfully, but
-- some expressions still live inside canonical text blocks. This migration
-- promotes only lines where the source itself prints a complete Boolean
-- expression. Answer placeholders such as `X = ______` are deliberately
-- rejected. No question/review status is changed and no source wording is
-- inferred.

CREATE TABLE IF NOT EXISTS public.boolean_expression_semantic_audits (
  question_id uuid PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
  source_paper_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE CASCADE,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9A-Fa-f]{64}$'),
  source_page integer NOT NULL CHECK (source_page > 0),
  expression_text text NOT NULL,
  latex text NOT NULL,
  enriched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boolean_expression_semantic_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.boolean_expression_semantic_audits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.boolean_expression_semantic_audits TO service_role;

CREATE OR REPLACE FUNCTION public.boolean_source_to_latex_v1(p_expression text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_out text := '';
  v_i integer := 1;
  v_len integer := char_length(p_expression);
  v_rest text;
  v_prev text;
  v_next text;
  v_token text;
  v_token_len integer;
BEGIN
  WHILE v_i <= v_len LOOP
    v_rest := substr(p_expression,v_i);
    v_prev := CASE WHEN v_i=1 THEN '' ELSE substr(p_expression,v_i-1,1) END;

    v_token := NULL;
    v_token_len := 0;
    FOREACH v_token IN ARRAY ARRAY['NAND','XOR','NOR','AND','NOT','OR'] LOOP
      v_token_len := char_length(v_token);
      v_next := substr(p_expression,v_i+v_token_len,1);
      IF upper(substr(v_rest,1,v_token_len))=v_token
         AND (v_prev='' OR v_prev !~ '[A-Za-z0-9_]')
         AND (v_next='' OR v_next !~ '[A-Za-z0-9_]') THEN
        EXIT;
      END IF;
      v_token := NULL;
      v_token_len := 0;
    END LOOP;

    IF v_token IS NOT NULL THEN
      v_out := v_out || chr(92) || 'mathrm{' || v_token || '}';
      v_i := v_i + v_token_len;
    ELSIF substr(p_expression,v_i,1)='.' THEN
      v_out := v_out || chr(92) || 'cdot ';
      v_i := v_i + 1;
    ELSIF lower(substr(p_expression,v_i,8))=' is 1 if' THEN
      v_out := v_out || ' ' || chr(92) || 'mathrm{is}\,1\,' || chr(92) || 'mathrm{if}';
      v_i := v_i + 8;
    ELSE
      v_out := v_out || substr(p_expression,v_i,1);
      v_i := v_i + 1;
    END IF;
  END LOOP;
  RETURN btrim(regexp_replace(v_out,'[[:space:]]+',' ','g'));
END;
$function$;

REVOKE ALL ON FUNCTION public.boolean_source_to_latex_v1(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.boolean_source_to_latex_v1(text) TO service_role;

CREATE OR REPLACE FUNCTION public.enrich_boolean_expression_semantics_v1(p_question_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_question public.questions%ROWTYPE;
  v_block jsonb;
  v_text text;
  v_line text;
  v_before text;
  v_after text;
  v_pos integer;
  v_latex text;
  v_source_page integer;
  v_new_blocks jsonb := '[]'::jsonb;
  v_changed boolean := false;
BEGIN
  SELECT * INTO v_question FROM public.questions WHERE id=p_question_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'question not found'; END IF;
  IF v_question.marks IS NULL OR v_question.content_json IS NULL OR v_question.content_version IS DISTINCT FROM 1 THEN
    RETURN jsonb_build_object('questionId',p_question_id,'status','canonical_content_unavailable');
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_question.content_json->'blocks') block
    WHERE block->>'type'='math' AND block->>'semantics'='boolean_expression'
  ) THEN
    RETURN jsonb_build_object('questionId',p_question_id,'status','already_enriched');
  END IF;

  FOR v_block IN SELECT value FROM jsonb_array_elements(v_question.content_json->'blocks') LOOP
    v_line := NULL;
    IF NOT v_changed AND v_block->>'type'='text' THEN
      v_text := v_block->>'text';
      SELECT btrim(candidate) INTO v_line
      FROM regexp_split_to_table(v_text,E'\\n+') candidate
      WHERE (
        candidate ~ '^[[:space:]]*[A-Z][A-Z0-9_]*[[:space:]]*=[[:space:]]*[A-Z0-9(]'
        AND candidate !~ '(_{3,}|\.{3,})'
        AND (
          candidate ~ '(AND|OR|XOR|NAND|NOR|NOT)'
          OR (candidate LIKE '%+%' AND candidate LIKE '%.%')
        )
      ) OR (
        candidate ~ '^[[:space:]]*[A-Z][[:space:]]+is[[:space:]]+1[[:space:]]+if[[:space:]]+'
        AND candidate ~ '(AND|OR|XOR|NAND|NOR|NOT)'
      )
      ORDER BY CASE WHEN candidate ~ '^[[:space:]]*[A-Z][[:space:]]+is[[:space:]]+1' THEN 0 ELSE 1 END
      LIMIT 1;

      IF v_line IS NOT NULL THEN
        v_pos := strpos(v_text,v_line);
        IF v_pos<1 THEN RAISE EXCEPTION 'Boolean expression boundary mismatch'; END IF;
        v_before := btrim(substr(v_text,1,v_pos-1));
        v_after := btrim(substr(v_text,v_pos+char_length(v_line)));
        v_source_page := nullif(v_block->'source'->>'page','')::integer;
        IF v_source_page IS NULL OR v_source_page<1 THEN
          RAISE EXCEPTION 'Boolean expression source page missing';
        END IF;
        v_latex := public.boolean_source_to_latex_v1(v_line);

        IF v_before<>'' THEN
          v_new_blocks := v_new_blocks || jsonb_build_array(v_block || jsonb_build_object('text',v_before));
        END IF;
        v_new_blocks := v_new_blocks || jsonb_build_array(jsonb_build_object(
          'type','math','semantics','boolean_expression','latex',v_latex,'display',true,
          'source',v_block->'source'
        ));
        IF v_after<>'' THEN
          v_new_blocks := v_new_blocks || jsonb_build_array(v_block || jsonb_build_object('text',v_after));
        END IF;
        v_changed := true;
        CONTINUE;
      END IF;
    END IF;
    v_new_blocks := v_new_blocks || jsonb_build_array(v_block);
  END LOOP;

  IF NOT v_changed THEN
    RETURN jsonb_build_object('questionId',p_question_id,'status','no_printed_expression');
  END IF;

  PERFORM public.set_question_structured_content_v1(
    p_question_id,
    v_question.source_paper_id,
    lower(v_question.content_json->'source'->>'sha256'),
    jsonb_set(v_question.content_json,'{blocks}',v_new_blocks,false)
  );

  INSERT INTO public.boolean_expression_semantic_audits(
    question_id,source_paper_id,source_sha256,source_page,expression_text,latex,enriched_at
  ) VALUES(
    p_question_id,v_question.source_paper_id,lower(v_question.content_json->'source'->>'sha256'),
    v_source_page,v_line,v_latex,now()
  )
  ON CONFLICT(question_id) DO UPDATE SET
    source_paper_id=excluded.source_paper_id,
    source_sha256=excluded.source_sha256,
    source_page=excluded.source_page,
    expression_text=excluded.expression_text,
    latex=excluded.latex,
    enriched_at=now();

  RETURN jsonb_build_object(
    'questionId',p_question_id,'status','enriched','expression',v_line,'latex',v_latex,'sourcePage',v_source_page
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.enrich_boolean_expression_semantics_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enrich_boolean_expression_semantics_v1(uuid) TO service_role;

-- Process the previously audited 28 heuristic candidates. The boundary-safe
-- function is expected to enrich 27 printed expressions and reject the one
-- answer-placeholder false positive without changing it.
DO $block$
DECLARE v_id uuid;
BEGIN
  FOR v_id IN
    SELECT q.id
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE q.marks IS NOT NULL
      AND q.content_json IS NOT NULL
      AND s.code IN ('0478','9618')
      AND q.stem_md ~* '(logic|boolean) expression'
      AND q.stem_md ~* '[A-Z][A-Z0-9_]*[[:space:]]*=[[:space:]]*[A-Z0-9(]'
      AND q.stem_md ~* '(AND|OR|XOR|NAND|NOR)'
  LOOP
    PERFORM public.enrich_boolean_expression_semantics_v1(v_id);
  END LOOP;
END
$block$;
