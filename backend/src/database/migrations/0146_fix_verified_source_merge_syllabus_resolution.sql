-- Historical source papers can belong to an older syllabus catalog row even when
-- the syllabus code is unchanged. Resolve the exact source paper first, then pin
-- the canonical variant to that same syllabus/component identity.

CREATE OR REPLACE FUNCTION public.merge_verified_equivalent_source_paper_v1(
  p_syllabus_code text,
  p_component integer,
  p_year integer,
  p_series text,
  p_source_variant integer,
  p_canonical_variant integer,
  p_evidence jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_syllabus_id uuid;
  v_component_id uuid;
  v_source_qp uuid;
  v_canonical_qp uuid;
  v_source_ms uuid;
  v_canonical_ms uuid;
  v_source_count integer;
  v_canonical_count integer;
  v_occurrence_count integer;
  v_external_refs integer;
  v_cross_dependencies integer;
  v_source_scheme_count integer;
  v_mapped_scheme_count integer;
  v_mapping jsonb;
  v_snapshot jsonb;
  v_existing_count integer;
BEGIN
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' THEN
    RAISE EXCEPTION 'canonical_merge_evidence_required';
  END IF;
  IF coalesce((p_evidence->>'sourceVerified')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'canonical_merge_requires_source_verified_evidence';
  END IF;
  IF p_source_variant=p_canonical_variant THEN
    RAISE EXCEPTION 'canonical_merge_same_variant:%',p_source_variant;
  END IF;

  SELECT sp.id,sp.syllabus_id,sp.component_id
  INTO STRICT v_source_qp,v_syllabus_id,v_component_id
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code=p_syllabus_code
    AND c.number=p_component
    AND sp.year=p_year
    AND sp.series::text=p_series
    AND sp.variant=p_source_variant
    AND sp.kind='QP'::paper_kind
    AND sp.source_url IS NOT NULL
  ORDER BY sp.created_at,sp.id
  LIMIT 1;

  SELECT sp.id INTO STRICT v_canonical_qp
  FROM public.source_papers sp
  WHERE sp.syllabus_id=v_syllabus_id
    AND sp.component_id=v_component_id
    AND sp.year=p_year
    AND sp.series::text=p_series
    AND sp.variant=p_canonical_variant
    AND sp.kind='QP'::paper_kind
    AND sp.source_url IS NOT NULL
  ORDER BY sp.created_at,sp.id
  LIMIT 1;

  SELECT sp.id INTO v_source_ms
  FROM public.source_papers sp
  WHERE sp.syllabus_id=v_syllabus_id
    AND sp.component_id=v_component_id
    AND sp.year=p_year
    AND sp.series::text=p_series
    AND sp.variant=p_source_variant
    AND sp.kind='MS'::paper_kind
    AND sp.source_url IS NOT NULL
  ORDER BY sp.created_at,sp.id
  LIMIT 1;

  SELECT sp.id INTO v_canonical_ms
  FROM public.source_papers sp
  WHERE sp.syllabus_id=v_syllabus_id
    AND sp.component_id=v_component_id
    AND sp.year=p_year
    AND sp.series::text=p_series
    AND sp.variant=p_canonical_variant
    AND sp.kind='MS'::paper_kind
    AND sp.source_url IS NOT NULL
  ORDER BY sp.created_at,sp.id
  LIMIT 1;

  SELECT count(*)::integer INTO v_source_count
  FROM public.questions q WHERE q.source_paper_id=v_source_qp;
  SELECT count(*)::integer INTO v_canonical_count
  FROM public.questions q WHERE q.source_paper_id=v_canonical_qp;

  IF v_source_count=0 AND EXISTS(
    SELECT 1 FROM public.source_paper_equivalences e
    WHERE e.source_paper_id=v_source_qp
      AND e.canonical_source_paper_id=v_canonical_qp
      AND e.equivalence_kind='exact_content'
  ) THEN
    SELECT a.question_count INTO v_existing_count
    FROM public.question_canonical_merge_audits a
    WHERE a.source_paper_id=v_source_qp;
    RETURN jsonb_build_object(
      'status','already_merged','sourcePaperId',v_source_qp,
      'canonicalSourcePaperId',v_canonical_qp,
      'questionCount',coalesce(v_existing_count,0)
    );
  END IF;

  IF v_source_count=0 OR v_canonical_count=0 THEN
    RAISE EXCEPTION 'canonical_merge_empty_tree source=% canonical=%',v_source_count,v_canonical_count;
  END IF;
  IF v_source_count<>v_canonical_count THEN
    RAISE EXCEPTION 'canonical_merge_question_count_mismatch source=% canonical=%',v_source_count,v_canonical_count;
  END IF;

  DROP TABLE IF EXISTS pg_temp._merge_question_map;
  CREATE TEMP TABLE _merge_question_map(
    source_question_id uuid PRIMARY KEY,
    canonical_question_id uuid NOT NULL,
    path text NOT NULL,
    source_display_ref text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _merge_question_map(source_question_id,canonical_question_id,path,source_display_ref)
  SELECT sq.id,cq.id,sq.path,sq.display_ref
  FROM public.questions sq
  JOIN public.questions cq
    ON cq.source_paper_id=v_canonical_qp AND cq.path=sq.path
  WHERE sq.source_paper_id=v_source_qp;

  IF (SELECT count(*) FROM _merge_question_map)<>v_source_count THEN
    RAISE EXCEPTION 'canonical_merge_path_set_mismatch';
  END IF;
  IF EXISTS(
    SELECT path FROM public.questions WHERE source_paper_id=v_canonical_qp
    EXCEPT SELECT path FROM public.questions WHERE source_paper_id=v_source_qp
  ) OR EXISTS(
    SELECT path FROM public.questions WHERE source_paper_id=v_source_qp
    EXCEPT SELECT path FROM public.questions WHERE source_paper_id=v_canonical_qp
  ) THEN
    RAISE EXCEPTION 'canonical_merge_path_set_mismatch';
  END IF;

  IF EXISTS(
    SELECT 1
    FROM _merge_question_map m
    JOIN public.questions sq ON sq.id=m.source_question_id
    JOIN public.questions cq ON cq.id=m.canonical_question_id
    WHERE (sq.content_json IS NOT NULL AND cq.content_json IS NULL)
       OR (nullif(btrim(coalesce(sq.stem_md,'')),'') IS NOT NULL
           AND nullif(btrim(coalesce(cq.stem_md,'')),'') IS NULL)
       OR (nullif(btrim(coalesce(sq.context_md,'')),'') IS NOT NULL
           AND nullif(btrim(coalesce(cq.context_md,'')),'') IS NULL)
       OR ((SELECT count(*) FROM public.question_assets a WHERE a.question_id=sq.id)
           > (SELECT count(*) FROM public.question_assets a WHERE a.question_id=cq.id))
  ) THEN
    RAISE EXCEPTION 'canonical_merge_canonical_payload_less_complete';
  END IF;

  SELECT
    (SELECT count(*) FROM public.assignment_questions x JOIN _merge_question_map m ON m.source_question_id=x.question_id)
    +(SELECT count(*) FROM public.assignment_context_items x JOIN _merge_question_map m ON m.source_question_id=x.question_id)
    +(SELECT count(*) FROM public.answers x JOIN _merge_question_map m ON m.source_question_id=x.question_id)
    +(SELECT count(*) FROM public.flashcards x JOIN _merge_question_map m ON m.source_question_id=x.source_question_id)
    +(SELECT count(*) FROM public.selection_items x JOIN _merge_question_map m ON m.source_question_id=x.question_id)
  INTO v_external_refs;
  IF v_external_refs<>0 THEN
    RAISE EXCEPTION 'canonical_merge_question_in_use:%',v_external_refs;
  END IF;

  SELECT count(*)::integer INTO v_cross_dependencies
  FROM public.question_dependencies qd
  WHERE (qd.question_id IN (SELECT source_question_id FROM _merge_question_map)
         OR qd.depends_on_id IN (SELECT source_question_id FROM _merge_question_map))
    AND NOT (
      qd.question_id IN (SELECT source_question_id FROM _merge_question_map)
      AND qd.depends_on_id IN (SELECT source_question_id FROM _merge_question_map)
    );
  IF v_cross_dependencies<>0 THEN
    RAISE EXCEPTION 'canonical_merge_cross_tree_dependency:%',v_cross_dependencies;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'legacyQuestionId',m.source_question_id,
    'canonicalQuestionId',m.canonical_question_id,
    'path',m.path,
    'sourceDisplayRef',m.source_display_ref
  ) ORDER BY m.path),'[]'::jsonb)
  INTO v_mapping
  FROM _merge_question_map m;

  SELECT jsonb_build_object(
    'questions',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',q.id,'path',q.path,'displayRef',q.display_ref,'status',q.status::text,
        'stemMd',q.stem_md,'contextMd',q.context_md,'marks',q.marks,
        'answerKind',q.answer_kind::text,'answerLines',q.answer_lines,
        'contentVersion',q.content_version
      ) ORDER BY q.sort_order,q.path)
      FROM public.questions q WHERE q.source_paper_id=v_source_qp
    ),'[]'::jsonb),
    'assets',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',a.id,'questionId',a.question_id,'kind',a.kind::text,
        'storagePath',a.storage_path,'contentHash',a.content_hash,
        'sourcePage',a.source_page,'sortOrder',a.sort_order
      ) ORDER BY a.question_id,a.sort_order,a.id)
      FROM public.question_assets a
      WHERE a.question_id IN (SELECT source_question_id FROM _merge_question_map)
    ),'[]'::jsonb),
    'markSchemes',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',ms.id,'questionId',ms.question_id,'sourcePaperId',ms.source_paper_id,
        'schemeType',ms.scheme_type::text,'maxMarks',ms.max_marks,
        'guidanceMd',ms.guidance_md,'status',ms.status::text,
        'points',coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id',p.id,'code',p.code,'text',p.text,'marks',p.marks,'sortOrder',p.sort_order
        ) ORDER BY p.sort_order,p.id) FROM public.mark_scheme_points p WHERE p.mark_scheme_id=ms.id),'[]'::jsonb)
      ) ORDER BY ms.question_id,ms.id)
      FROM public.mark_schemes ms
      WHERE ms.question_id IN (SELECT source_question_id FROM _merge_question_map)
    ),'[]'::jsonb),
    'pointRepairHistory',coalesce((
      SELECT jsonb_agg(to_jsonb(h) ORDER BY h.created_at,h.id)
      FROM public.mark_scheme_point_source_repair_history h
      JOIN public.mark_schemes ms ON ms.id=h.mark_scheme_id
      WHERE ms.question_id IN (SELECT source_question_id FROM _merge_question_map)
    ),'[]'::jsonb),
    'taxonomy',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'questionId',qs.question_id,'subtopicId',qs.subtopic_id,
        'isPrimary',qs.is_primary,'weight',qs.weight,'confidence',qs.confidence,'setBy',qs.set_by
      ) ORDER BY qs.question_id,qs.is_primary DESC,qs.subtopic_id)
      FROM public.question_subtopics qs
      WHERE qs.question_id IN (SELECT source_question_id FROM _merge_question_map)
    ),'[]'::jsonb),
    'learningObjectives',coalesce((
      SELECT jsonb_agg(to_jsonb(qlo) ORDER BY qlo.question_id,qlo.lo_id)
      FROM public.question_learning_objectives qlo
      WHERE qlo.question_id IN (SELECT source_question_id FROM _merge_question_map)
    ),'[]'::jsonb)
  ) INTO v_snapshot;

  INSERT INTO public.source_paper_equivalences(
    source_paper_id,canonical_source_paper_id,equivalence_kind,verified_at,evidence
  ) VALUES(v_source_qp,v_canonical_qp,'exact_content',now(),p_evidence)
  ON CONFLICT(source_paper_id) DO UPDATE
  SET canonical_source_paper_id=excluded.canonical_source_paper_id,
      equivalence_kind=excluded.equivalence_kind,
      verified_at=excluded.verified_at,
      evidence=excluded.evidence,
      updated_at=now();

  IF v_source_ms IS NOT NULL AND v_canonical_ms IS NOT NULL THEN
    INSERT INTO public.source_paper_equivalences(
      source_paper_id,canonical_source_paper_id,equivalence_kind,verified_at,evidence
    ) VALUES(v_source_ms,v_canonical_ms,'exact_content',now(),p_evidence || jsonb_build_object('side','MS'))
    ON CONFLICT(source_paper_id) DO UPDATE
    SET canonical_source_paper_id=excluded.canonical_source_paper_id,
        equivalence_kind=excluded.equivalence_kind,
        verified_at=excluded.verified_at,
        evidence=excluded.evidence,
        updated_at=now();
  END IF;

  UPDATE public.question_source_occurrences o
  SET question_id=m.canonical_question_id,
      is_primary=false,
      equivalence_basis='source_verified_exact',
      verified_at=now(),
      evidence=o.evidence || p_evidence || jsonb_build_object(
        'canonicalSourcePaperId',v_canonical_qp,'legacyQuestionId',m.source_question_id
      ),
      legacy_question_id=m.source_question_id,
      updated_at=now()
  FROM _merge_question_map m
  WHERE o.question_id=m.source_question_id AND o.source_paper_id=v_source_qp;
  GET DIAGNOSTICS v_occurrence_count = ROW_COUNT;
  IF v_occurrence_count<>v_source_count THEN
    RAISE EXCEPTION 'canonical_merge_occurrence_count_mismatch:%/%',v_occurrence_count,v_source_count;
  END IF;

  INSERT INTO public.question_dependencies(question_id,depends_on_id,kind,strength,evidence,detected_by,confidence)
  SELECT fm.canonical_question_id,tm.canonical_question_id,qd.kind,qd.strength,qd.evidence,qd.detected_by,qd.confidence
  FROM public.question_dependencies qd
  JOIN _merge_question_map fm ON fm.source_question_id=qd.question_id
  JOIN _merge_question_map tm ON tm.source_question_id=qd.depends_on_id
  ON CONFLICT(question_id,depends_on_id) DO UPDATE
  SET confidence=greatest(coalesce(public.question_dependencies.confidence,0),coalesce(excluded.confidence,0)),
      evidence=CASE WHEN coalesce(public.question_dependencies.evidence,'')='' THEN excluded.evidence ELSE public.question_dependencies.evidence END;

  UPDATE public.question_source_repair_history h SET question_id=m.canonical_question_id
  FROM _merge_question_map m WHERE h.question_id=m.source_question_id;

  DELETE FROM public.question_taxonomy_review_history h
  USING _merge_question_map m
  WHERE h.question_id=m.source_question_id
    AND EXISTS(SELECT 1 FROM public.question_taxonomy_review_history c WHERE c.question_id=m.canonical_question_id AND c.review_tag=h.review_tag);
  UPDATE public.question_taxonomy_review_history h SET question_id=m.canonical_question_id
  FROM _merge_question_map m WHERE h.question_id=m.source_question_id;

  DELETE FROM public.structured_content_backfill_audits h
  USING _merge_question_map m
  WHERE h.question_id=m.source_question_id
    AND EXISTS(SELECT 1 FROM public.structured_content_backfill_audits c
      WHERE c.question_id=m.canonical_question_id AND c.source_sha256=h.source_sha256 AND c.parser_version=h.parser_version);
  UPDATE public.structured_content_backfill_audits h SET question_id=m.canonical_question_id
  FROM _merge_question_map m WHERE h.question_id=m.source_question_id;

  DELETE FROM public.boolean_expression_semantic_audits h
  USING _merge_question_map m
  WHERE h.question_id=m.source_question_id
    AND EXISTS(SELECT 1 FROM public.boolean_expression_semantic_audits c WHERE c.question_id=m.canonical_question_id);
  UPDATE public.boolean_expression_semantic_audits h SET question_id=m.canonical_question_id
  FROM _merge_question_map m WHERE h.question_id=m.source_question_id;

  UPDATE public.cross_checks x SET ref_id=m.canonical_question_id
  FROM _merge_question_map m WHERE x.ref_table='questions' AND x.ref_id=m.source_question_id;

  DROP TABLE IF EXISTS pg_temp._merge_scheme_map;
  CREATE TEMP TABLE _merge_scheme_map(
    source_scheme_id uuid PRIMARY KEY,
    canonical_scheme_id uuid NOT NULL,
    source_question_id uuid NOT NULL,
    canonical_question_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _merge_scheme_map(source_scheme_id,canonical_scheme_id,source_question_id,canonical_question_id)
  SELECT sms.id,cms.id,m.source_question_id,m.canonical_question_id
  FROM _merge_question_map m
  JOIN public.mark_schemes sms ON sms.question_id=m.source_question_id
  JOIN LATERAL (
    SELECT cm.id
    FROM public.mark_schemes cm
    WHERE cm.question_id=m.canonical_question_id AND cm.max_marks=sms.max_marks
    ORDER BY (cm.status='approved'::review_status) DESC,cm.created_at,cm.id
    LIMIT 1
  ) cms ON true;

  SELECT count(*)::integer INTO v_source_scheme_count
  FROM public.mark_schemes ms WHERE ms.question_id IN (SELECT source_question_id FROM _merge_question_map);
  SELECT count(*)::integer INTO v_mapped_scheme_count FROM _merge_scheme_map;
  IF v_source_scheme_count<>v_mapped_scheme_count THEN
    RAISE EXCEPTION 'canonical_merge_mark_scheme_mapping_mismatch:%/%',v_source_scheme_count,v_mapped_scheme_count;
  END IF;

  DELETE FROM public.mark_scheme_source_audits a
  USING _merge_scheme_map m
  WHERE a.mark_scheme_id=m.source_scheme_id
    AND EXISTS(SELECT 1 FROM public.mark_scheme_source_audits c
      WHERE c.mark_scheme_id=m.canonical_scheme_id AND c.audit_version=a.audit_version AND c.source_sha256=a.source_sha256);
  UPDATE public.mark_scheme_source_audits a SET mark_scheme_id=m.canonical_scheme_id
  FROM _merge_scheme_map m WHERE a.mark_scheme_id=m.source_scheme_id;

  UPDATE public.validation_findings vf
  SET resolved_at=coalesce(vf.resolved_at,now()),
      resolution=coalesce(vf.resolution,'canonicalized: verified exact source occurrence')
  WHERE vf.resolved_at IS NULL AND (
    (vf.ref_table='questions' AND vf.ref_id IN (SELECT source_question_id FROM _merge_question_map))
    OR (vf.ref_table='mark_schemes' AND vf.ref_id IN (SELECT source_scheme_id FROM _merge_scheme_map))
  );

  DELETE FROM public.questions q WHERE q.source_paper_id=v_source_qp;

  IF EXISTS(SELECT 1 FROM public.questions q WHERE q.source_paper_id=v_source_qp) THEN
    RAISE EXCEPTION 'canonical_merge_physical_source_rows_remain';
  END IF;
  SELECT count(*)::integer INTO v_occurrence_count
  FROM public.question_source_occurrences o WHERE o.source_paper_id=v_source_qp;
  IF v_occurrence_count<>v_source_count THEN
    RAISE EXCEPTION 'canonical_merge_source_occurrences_missing:%/%',v_occurrence_count,v_source_count;
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.question_source_occurrences o
    WHERE o.source_paper_id=v_source_qp AND (o.is_primary OR o.equivalence_basis<>'source_verified_exact')
  ) THEN
    RAISE EXCEPTION 'canonical_merge_source_occurrence_state_invalid';
  END IF;

  INSERT INTO public.question_canonical_merge_audits(
    source_paper_id,canonical_source_paper_id,source_mark_scheme_paper_id,canonical_mark_scheme_paper_id,
    question_count,mapping,snapshot,evidence
  ) VALUES(v_source_qp,v_canonical_qp,v_source_ms,v_canonical_ms,v_source_count,v_mapping,v_snapshot,p_evidence)
  ON CONFLICT(source_paper_id) DO UPDATE
  SET canonical_source_paper_id=excluded.canonical_source_paper_id,
      source_mark_scheme_paper_id=excluded.source_mark_scheme_paper_id,
      canonical_mark_scheme_paper_id=excluded.canonical_mark_scheme_paper_id,
      question_count=excluded.question_count,mapping=excluded.mapping,snapshot=excluded.snapshot,
      evidence=excluded.evidence,merged_at=now();

  RETURN jsonb_build_object(
    'status','merged','sourcePaperId',v_source_qp,'canonicalSourcePaperId',v_canonical_qp,
    'sourceMarkSchemePaperId',v_source_ms,'canonicalMarkSchemePaperId',v_canonical_ms,
    'questionCount',v_source_count,'occurrenceCount',v_occurrence_count,
    'canonicalPhysicalQuestionCount',v_canonical_count
  );
END
$function$;

REVOKE ALL ON FUNCTION public.merge_verified_equivalent_source_paper_v1(text,integer,integer,text,integer,integer,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.merge_verified_equivalent_source_paper_v1(text,integer,integer,text,integer,integer,jsonb)
  TO service_role;
