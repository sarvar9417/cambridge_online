-- Source-backed repair for 9618/12/M/J/25 Q1(a).
--
-- Verified QP provenance: SHA-256
-- 607722293452744ee7107b7365cac73664d51e0eb0f7487587d038e22467826e
-- Source page 2 contains: intro text, a six-row statement table, the task
-- instruction, and a three-row correction table. The previous canonical v1
-- content flattened the first table into one prose block and then showed a
-- page crop, which made Live Challenge difficult to read.
--
-- This repair reconstructs only the structure that is explicitly verified by
-- the pinned QP and the existing source crop. It does not infer answers.

DO $repair$
DECLARE
  v_q public.questions%ROWTYPE;
  v_sp public.source_papers%ROWTYPE;
  v_source_asset public.question_assets%ROWTYPE;
  v_content jsonb;
BEGIN
  SELECT q.* INTO v_q
  FROM public.questions q
  WHERE q.display_ref='9618/12/M/J/25 Q1(a)'
  ORDER BY q.updated_at DESC,q.id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Q1(a) target question unavailable';
  END IF;

  SELECT sp.* INTO v_sp
  FROM public.source_papers sp
  WHERE sp.id=v_q.source_paper_id
    AND sp.kind='QP'::paper_kind;

  IF NOT FOUND OR lower(coalesce(v_sp.sha256,''))<>
    '607722293452744ee7107b7365cac73664d51e0eb0f7487587d038e22467826e' THEN
    RAISE EXCEPTION 'Q1(a) verified QP provenance mismatch';
  END IF;

  IF v_q.content_version IS DISTINCT FROM 1 OR v_q.content_json IS NULL THEN
    RAISE EXCEPTION 'Q1(a) canonical v1 content unavailable';
  END IF;

  IF v_q.content_json->'source'->>'paperId'<>v_sp.id::text
     OR lower(coalesce(v_q.content_json->'source'->>'sha256',''))<>lower(v_sp.sha256) THEN
    RAISE EXCEPTION 'Q1(a) canonical source provenance mismatch';
  END IF;

  SELECT qa.* INTO v_source_asset
  FROM public.question_assets qa
  WHERE qa.question_id=v_q.id
    AND qa.source_page=2
    AND qa.kind='table'
    AND qa.crop_status='ready'
    AND qa.source_bbox='[153, 881, 1542, 2214]'::jsonb
    AND nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
    AND qa.alt_text='Source-faithful statement table and correction table for 9618/12/M/J/25 Q1(a).'
  ORDER BY qa.sort_order,qa.id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Q1(a) verified source table crop unavailable';
  END IF;

  v_content:=jsonb_build_object(
    'version',1,
    'source',jsonb_build_object(
      'paperId',v_sp.id::text,
      'sha256',lower(v_sp.sha256)
    ),
    'blocks',jsonb_build_array(
      jsonb_build_object(
        'type','text','style','paragraph',
        'text','The table has six statements about the Von Neumann model for a computer system. Three of the statements are incorrect.',
        'source',jsonb_build_object('page',2)
      ),
      jsonb_build_object(
        'type','table','kind','table',
        'headers',jsonb_build_array('Statement number','Statement'),
        'rows',jsonb_build_array(
          jsonb_build_array('1','The Program Counter (PC) stores the next instruction to be fetched from memory.'),
          jsonb_build_array('2','The Arithmetic and Logic Unit (ALU) performs mathematical and logical operations.'),
          jsonb_build_array('3','The Control Unit (CU) sends signals to other components on the data bus.'),
          jsonb_build_array('4','The Memory Data Register (MDR) transfers data to the memory address stored in the Memory Address Register (MAR).'),
          jsonb_build_array('5','The MAR stores an address from memory.'),
          jsonb_build_array('6','The Accumulator (ACC) stores the result of calculations.')
        ),
        'editableCells','[]'::jsonb,
        'source',jsonb_build_object('page',2)
      ),
      jsonb_build_object(
        'type','text','style','task',
        'text','Complete the table by writing the three incorrect statement numbers and the corrected statements.',
        'source',jsonb_build_object('page',2)
      ),
      jsonb_build_object(
        'type','table','kind','table',
        'headers',jsonb_build_array('Incorrect statement number','Corrected statement'),
        'rows',jsonb_build_array(
          jsonb_build_array(NULL,NULL),
          jsonb_build_array(NULL,NULL),
          jsonb_build_array(NULL,NULL)
        ),
        'editableCells',jsonb_build_array(
          jsonb_build_array(0,0),jsonb_build_array(0,1),
          jsonb_build_array(1,0),jsonb_build_array(1,1),
          jsonb_build_array(2,0),jsonb_build_array(2,1)
        ),
        'source',jsonb_build_object('page',2)
      ),
      jsonb_build_object(
        'type','answer_area','kind','table_cells','lines',NULL,
        'source',jsonb_build_object('page',2)
      )
    )
  );

  PERFORM public.set_question_structured_content_v1(
    v_q.id,v_sp.id,lower(v_sp.sha256),v_content
  );

  UPDATE public.validation_findings
  SET resolved_at=coalesce(resolved_at,now()),
      resolution=coalesce(
        resolution,
        'Verified 9618/12/M/J/25 page 2 reconstructed as semantic source-backed tables.'
      )
  WHERE ref_table='questions'
    AND ref_id=v_q.id
    AND rule_code IN (
      'source_generic_table_ocr_spill',
      'source_structure_required_but_missing_table'
    )
    AND resolved_at IS NULL;

  UPDATE public.questions q
  SET status='approved'::review_status,
      notes=concat_ws(
        E'\n',
        nullif(q.notes,''),
        'source-fidelity-repair: 9618/12/M/J/25 Q1(a) page-2 statement/correction tables restored as canonical semantic tables.'
      ),
      updated_at=now()
  WHERE q.id=v_q.id
    AND NOT EXISTS (
      SELECT 1
      FROM public.validation_findings vf
      WHERE vf.ref_table='questions'
        AND vf.ref_id=q.id
        AND vf.resolved_at IS NULL
        AND vf.severity='error'
    );

  INSERT INTO public.structured_content_backfill_audits(
    question_id,source_paper_id,source_sha256,source_page,parser_version,evidence
  ) VALUES (
    v_q.id,v_sp.id,lower(v_sp.sha256),2,
    'q1a-semantic-table-source-repair-v1',
    jsonb_build_object(
      'displayRef',v_q.display_ref,
      'sourceRef','9618/12/M/J/25 page 2',
      'repair','split_flattened_statement_table_into_source_verified_semantic_blocks',
      'sourceAssetId',v_source_asset.id::text,
      'sourceBbox',v_source_asset.source_bbox,
      'blockSequence',jsonb_build_array('text','table','task','table','answer_area')
    )
  )
  ON CONFLICT(question_id,source_sha256,parser_version) DO UPDATE
    SET source_page=excluded.source_page,
        evidence=excluded.evidence,
        created_at=now();
END
$repair$;
