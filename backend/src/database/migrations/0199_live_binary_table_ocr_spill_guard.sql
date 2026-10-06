-- 0199: source-faithful truth-table context and flattened binary-table OCR guard.
--
-- Verified source: Cambridge 9618/32/M/J/23 pages 10-11.
-- Q9 has one truth table on page 10 and a K-map / parts (b)-(e) on page 11.
-- Source table cells must be rendered as source-backed content, not duplicated into prose.

DO $repair$
DECLARE
  v_sp public.source_papers%ROWTYPE;
  v_q public.questions%ROWTYPE;
  v_truth_id uuid; v_truth_alt text; v_truth_page int;
  v_kmap_id uuid; v_kmap_alt text; v_kmap_page int;
  v_blocks jsonb; v_content jsonb;
BEGIN
  SELECT sp.* INTO v_sp
  FROM public.source_papers sp
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code='9618' AND sp.kind='QP'::paper_kind AND sp.year=2023
    AND EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.source_paper_id=sp.id AND q.display_ref='9618/32/M/J/23 Q9(a)'
    )
  ORDER BY sp.created_at DESC,sp.id LIMIT 1;

  IF NOT FOUND OR coalesce(v_sp.sha256,'') !~ '^[0-9A-Fa-f]{64}$' THEN
    RAISE EXCEPTION '0199 verified 9618/32/M/J/23 source unavailable';
  END IF;

  SELECT qa.id,qa.alt_text,qa.source_page
  INTO v_truth_id,v_truth_alt,v_truth_page
  FROM public.questions owner
  JOIN public.question_assets qa ON qa.question_id=owner.id
  WHERE owner.source_paper_id=v_sp.id
    AND owner.display_ref='9618/32/M/J/23 Q9(a)'
    AND qa.kind IN ('diagram','image','table')
    AND qa.source_page=10
    AND (
      nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
      OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
    )
  ORDER BY qa.sort_order,qa.id LIMIT 1;
  IF v_truth_id IS NULL THEN RAISE EXCEPTION '0199 verified truth-table asset unavailable'; END IF;

  FOR v_q IN
    SELECT q.* FROM public.questions q
    WHERE q.source_paper_id=v_sp.id
      AND q.display_ref IN (
        '9618/32/M/J/23 Q9(a)','9618/32/M/J/23 Q9(b)',
        '9618/32/M/J/23 Q9(c)','9618/32/M/J/23 Q9(d)',
        '9618/32/M/J/23 Q9(e)'
      )
    ORDER BY q.display_ref
  LOOP
    IF v_q.content_version IS DISTINCT FROM 1 OR v_q.content_json IS NULL THEN
      RAISE EXCEPTION '0199 canonical content unavailable for %',v_q.display_ref;
    END IF;
    IF v_q.content_json->'source'->>'paperId'<>v_sp.id::text
       OR lower(coalesce(v_q.content_json->'source'->>'sha256',''))<>lower(v_sp.sha256) THEN
      RAISE EXCEPTION '0199 source provenance mismatch for %',v_q.display_ref;
    END IF;

    v_kmap_id:=NULL; v_kmap_alt:=NULL; v_kmap_page:=NULL;
    IF v_q.display_ref IN (
      '9618/32/M/J/23 Q9(b)','9618/32/M/J/23 Q9(c)','9618/32/M/J/23 Q9(d)'
    ) THEN
      SELECT qa.id,qa.alt_text,qa.source_page INTO v_kmap_id,v_kmap_alt,v_kmap_page
      FROM public.question_assets qa
      WHERE qa.question_id=v_q.id
        AND qa.kind IN ('diagram','image','table')
        AND qa.source_page=11
        AND (
          nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
          OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
          OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        )
      ORDER BY qa.sort_order,qa.id LIMIT 1;
      IF v_kmap_id IS NULL THEN RAISE EXCEPTION '0199 verified K-map asset unavailable for %',v_q.display_ref; END IF;
    END IF;

    IF v_q.display_ref='9618/32/M/J/23 Q9(a)' THEN
      v_blocks:=jsonb_build_array(
        jsonb_build_object('type','text','style','paragraph','text','This truth table represents a logic circuit.','source',jsonb_build_object('page',10)),
        jsonb_build_object('type','asset','kind','image','assetId',v_truth_id::text,'altText',coalesce(v_truth_alt,'Original Cambridge truth table for 9618/32/M/J/23 Q9'),'source',jsonb_build_object('page',10)),
        jsonb_build_object('type','text','style','task','text','Write the Boolean logic expression that corresponds to the given truth table as the sum-of-products.'||E'\n\n'||'Z = __________','source',jsonb_build_object('page',10))
      );
    ELSIF v_q.display_ref='9618/32/M/J/23 Q9(b)' THEN
      v_blocks:=jsonb_build_array(
        jsonb_build_object('type','text','style','paragraph','text','This truth table represents a logic circuit.','source',jsonb_build_object('page',10)),
        jsonb_build_object('type','asset','kind','image','assetId',v_truth_id::text,'altText',coalesce(v_truth_alt,'Original Cambridge truth table for 9618/32/M/J/23 Q9'),'source',jsonb_build_object('page',10)),
        jsonb_build_object('type','text','style','task','text','Complete the Karnaugh map (K-map) for the given truth table.','source',jsonb_build_object('page',11)),
        jsonb_build_object('type','asset','kind','image','assetId',v_kmap_id::text,'altText',coalesce(v_kmap_alt,'Original Cambridge K-map for 9618/32/M/J/23 Q9(b)'),'source',jsonb_build_object('page',11)),
        jsonb_build_object('type','answer_area','kind','drawing','lines',NULL,'source',jsonb_build_object('page',11))
      );
    ELSIF v_q.display_ref='9618/32/M/J/23 Q9(c)' THEN
      v_blocks:=jsonb_build_array(
        jsonb_build_object('type','text','style','task','text','Draw loop(s) around appropriate group(s) in the K-map to produce an optimal sum-of-products.','source',jsonb_build_object('page',11)),
        jsonb_build_object('type','asset','kind','image','assetId',v_kmap_id::text,'altText',coalesce(v_kmap_alt,'Original Cambridge K-map for 9618/32/M/J/23 Q9(c)'),'source',jsonb_build_object('page',11)),
        jsonb_build_object('type','answer_area','kind','drawing','lines',NULL,'source',jsonb_build_object('page',11))
      );
    ELSIF v_q.display_ref='9618/32/M/J/23 Q9(d)' THEN
      v_blocks:=jsonb_build_array(
        jsonb_build_object('type','text','style','task','text','Write the Boolean logic expression from your answer to part (c) as a simplified sum-of-products.'||E'\n\n'||'Z = __________','source',jsonb_build_object('page',11)),
        jsonb_build_object('type','asset','kind','image','assetId',v_kmap_id::text,'altText',coalesce(v_kmap_alt,'Original Cambridge K-map for 9618/32/M/J/23 Q9(d)'),'source',jsonb_build_object('page',11))
      );
    ELSE
      v_blocks:=jsonb_build_array(
        jsonb_build_object('type','text','style','task','text','Use Boolean algebra to give your answer to part (d) in its simplest form.'||E'\n\n'||'Z = __________','source',jsonb_build_object('page',11))
      );
    END IF;

    v_content:=jsonb_set(v_q.content_json,'{blocks}',v_blocks,false);
    PERFORM public.set_question_structured_content_v1(v_q.id,v_sp.id,lower(v_sp.sha256),v_content);

    INSERT INTO public.structured_content_backfill_audits(
      question_id,source_paper_id,source_sha256,source_page,parser_version,evidence
    ) VALUES (
      v_q.id,v_sp.id,lower(v_sp.sha256),
      CASE WHEN v_q.display_ref='9618/32/M/J/23 Q9(a)' THEN 10 ELSE 11 END,
      'truth-table-ocr-spill-cleanup-v1',
      jsonb_build_object(
        'displayRef',v_q.display_ref,'sourceRef','9618/32/M/J/23 pages 10-11',
        'repair','remove_flattened_truth_table_cells_from_prose',
        'truthTableAssetId',v_truth_id::text,
        'kMapAssetId',CASE WHEN v_kmap_id IS NULL THEN NULL ELSE v_kmap_id::text END
      )
    )
    ON CONFLICT(question_id,source_sha256,parser_version) DO UPDATE
      SET source_page=excluded.source_page,evidence=excluded.evidence,created_at=now();
  END LOOP;

  INSERT INTO public.question_dependencies(
    question_id,depends_on_id,kind,strength,evidence,detected_by,confidence
  )
  SELECT c.id,b.id,'answer_ref','required',
         'Verified Cambridge 9618/32/M/J/23 source: part (c) operates on the K-map completed in part (b).',
         'source-fidelity-0199',1.0
  FROM public.questions c
  JOIN public.questions b ON b.source_paper_id=c.source_paper_id
  WHERE c.display_ref='9618/32/M/J/23 Q9(c)'
    AND b.display_ref='9618/32/M/J/23 Q9(b)'
  ON CONFLICT(question_id,depends_on_id) DO UPDATE
    SET kind=excluded.kind,strength=excluded.strength,evidence=excluded.evidence,
        detected_by=excluded.detected_by,confidence=excluded.confidence;
END
$repair$;

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v8(
  p_syllabus_code text,p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE v_base jsonb; v_added integer:=0; v_demoted integer:=0;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code; END IF;
  IF p_year<2015 OR p_year>2035 THEN RAISE EXCEPTION 'invalid_year:%',p_year; END IF;
  v_base:=public.flag_source_fidelity_requirements_v7(p_syllabus_code,p_year);

  CREATE TEMP TABLE _source_binary_table_spill_v8(
    question_id uuid PRIMARY KEY,display_ref text NOT NULL,cue text NOT NULL,binary_rows integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_binary_table_spill_v8(question_id,display_ref,cue,binary_rows)
  WITH eligible AS (
    SELECT q.id,q.display_ref,q.content_json
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code AND sp.year=p_year
      AND q.marks IS NOT NULL AND q.status IN ('approved','needs_review')
      AND q.content_version=1 AND q.content_json IS NOT NULL
  ), blocks AS (
    SELECT e.id,e.display_ref,b.block,
      lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g')) normalized,
      (SELECT count(*)::int FROM regexp_split_to_table(coalesce(b.block->>'text',''),E'\n') line
       WHERE btrim(line) ~ '^[01](?:[[:space:]]+[01]){2,}$') binary_rows
    FROM eligible e
    CROSS JOIN LATERAL jsonb_array_elements(e.content_json->'blocks') b(block)
    WHERE b.block->>'type'='text'
  )
  SELECT b.id,b.display_ref,left(coalesce(b.block->>'text',''),500),b.binary_rows
  FROM blocks b
  WHERE b.binary_rows>=4 AND b.normalized ~ '(truth[[:space:]]+table|input[[:space:]]+output)'
  ON CONFLICT(question_id) DO NOTHING;

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT 'source_table_ocr_spill','error','questions',g.question_id,
    'Canonical learner-facing prose contains flattened binary truth-table rows. Source table cells must be rendered as structured/source-backed table content, not duplicated into prose.',
    jsonb_build_object(
      'displayRef',g.display_ref,'cue',g.cue,'binaryRows',g.binary_rows,
      'audit','source-fidelity-detector-v8-binary-table-spill',
      'detectorVersion','v8','syllabusCode',p_syllabus_code,'year',p_year
    )
  FROM _source_binary_table_spill_v8 g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=g.question_id
      AND vf.rule_code='source_table_ocr_spill' AND vf.resolved_at IS NULL
  );
  GET DIAGNOSTICS v_added=ROW_COUNT;

  UPDATE public.questions q
  SET status='needs_review'::review_status,
      notes=CASE WHEN coalesce(q.notes,'') LIKE '%source-fidelity-detector-v8:%' THEN q.notes
        ELSE concat_ws(E'\n',nullif(q.notes,''),
          'source-fidelity-detector-v8: flattened binary truth-table rows are mixed into canonical prose; structured/source-backed table repair is required.')
      END,
      updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS(SELECT 1 FROM _source_binary_table_spill_v8 g WHERE g.question_id=q.id);
  GET DIAGNOSTICS v_demoted=ROW_COUNT;

  RETURN jsonb_build_object(
    'version','source-fidelity-detector-v8','syllabusCode',p_syllabus_code,'year',p_year,
    'baseV7',v_base,'binaryTableSpillQuestions',coalesce((SELECT count(*) FROM _source_binary_table_spill_v8),0),
    'findingsAdded',v_added,'approvedDemoted',v_demoted
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v8(text,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v8(text,int) TO service_role;

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v1(
  p_syllabus_code text,p_year int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.flag_source_fidelity_requirements_v8(p_syllabus_code,p_year)
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int) TO service_role;
