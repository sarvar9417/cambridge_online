-- Broad Cambridge source-fidelity audit.
--
-- 0109 intentionally started with narrow high-confidence phrases. Production
-- audit showed that older papers also use wording such as "table below",
-- "trace table", "This flowchart represents..." and "The diagram below
-- shows...". Those structures carry row/column or spatial semantics and must not
-- remain flattened prose. This migration broadens the fail-closed gate over all
-- source-backed QP nodes (including parent/context nodes), while leaving actual
-- source repair to the SHA-verified v2 repair contract.

DO $$
DECLARE
  v_findings integer;
  v_questions integer;
  v_downgraded integer;
BEGIN
  CREATE TEMP TABLE _broad_source_fidelity_missing(
    question_id uuid NOT NULL,
    rule_code text NOT NULL,
    cue text NOT NULL,
    PRIMARY KEY(question_id,rule_code)
  ) ON COMMIT DROP;

  INSERT INTO _broad_source_fidelity_missing(question_id,rule_code,cue)
  WITH RECURSIVE eligible AS (
    SELECT
      q.id,q.parent_id,q.answer_kind::text answer_kind,
      regexp_replace(
        lower(coalesce(q.stem_md,'') || ' ' || coalesce(q.context_md,'')),
        '[[:space:]]+',' ','g'
      ) source_text
    FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
    WHERE q.status IN ('approved','needs_review')
  ), chain AS (
    SELECT e.id leaf_id,e.id node_id,e.parent_id FROM eligible e
    UNION ALL
    SELECT c.leaf_id,p.id,p.parent_id
    FROM chain c JOIN questions p ON p.id=c.parent_id
  ), presence AS (
    SELECT e.id,
      bool_or(
        qa.id IS NOT NULL AND (
          (
            qa.kind='table'
            AND nullif(trim(coalesce(qa.content_md,'')),'') IS NOT NULL
          )
          OR (
            qa.kind IN ('diagram','image')
            AND (
              nullif(trim(coalesce(qa.content_md,'')),'') IS NOT NULL
              OR nullif(trim(coalesce(qa.storage_path,'')),'') IS NOT NULL
              OR nullif(trim(coalesce(qa.svg_markup,'')),'') IS NOT NULL
            )
          )
        )
      ) has_structure,
      bool_or(
        qa.id IS NOT NULL
        AND qa.kind IN ('diagram','image')
        AND (
          nullif(trim(coalesce(qa.content_md,'')),'') IS NOT NULL
          OR nullif(trim(coalesce(qa.storage_path,'')),'') IS NOT NULL
          OR nullif(trim(coalesce(qa.svg_markup,'')),'') IS NOT NULL
        )
      ) has_visual
    FROM eligible e
    LEFT JOIN chain c ON c.leaf_id=e.id
    LEFT JOIN question_assets qa ON qa.question_id=c.node_id
    GROUP BY e.id
  ), candidates AS (
    SELECT e.id question_id,'source_structure_required_but_missing_table'::text rule_code,
           'broad_table_layout'::text cue
    FROM eligible e JOIN presence p ON p.id=e.id
    WHERE NOT p.has_structure
      AND (
        e.answer_kind='table'
        OR e.source_text ~ (
          'table[[:space:]]+(below|above|provided|given|shows|showing|contains|lists|represents)'
          || '|following[[:space:]]+(truth[[:space:]]+|trace[[:space:]]+|identifier[[:space:]]+)?table'
          || '|(truth|trace|identifier)[[:space:]]+table'
          || '|karnaugh[[:space:]]+map|k-?map'
          || '|complete.{0,100}table'
          || '|fill[[:space:]]+in.{0,100}table'
          || '|tick.{0,220}(row|column|box|table)'
          || '|table.{0,220}tick'
          || '|(answers?|results?).{0,160}table[[:space:]]+provided'
        )
      )

    UNION ALL

    SELECT e.id,'source_structure_required_but_missing_layout','broad_matching_layout'
    FROM eligible e JOIN presence p ON p.id=e.id
    WHERE NOT p.has_structure
      AND e.source_text ~ (
        'match[[:space:]]+each'
        || '|draw[[:space:]]+(a[[:space:]]+)?line.{0,200}(match|connect)'
        || '|draw[[:space:]]+lines?.{0,200}(match|connect)'
        || '|join[[:space:]]+each.{0,200}(correct|matching)'
        || '|connect[[:space:]]+each'
      )

    UNION ALL

    SELECT e.id,'source_visual_required_but_missing','broad_source_visual'
    FROM eligible e JOIN presence p ON p.id=e.id
    WHERE NOT p.has_visual
      AND e.source_text ~ (
        'following[[:space:]]+(logic[[:space:]]+)?circuit'
        || '|(^|[.!?][[:space:]]+)((a|the|this)[[:space:]]+)?logic[[:space:]]+circuit[[:space:]]+((is[[:space:]]+)?shown|below|above|shows|represents)'
        || '|circuit[[:space:]]+shown[[:space:]]+(below|above)'
        || '|following[[:space:]]+diagram'
        || '|diagram[[:space:]]+((is[[:space:]]+)?shown|below|above|shows|represents)'
        || '|shown[[:space:]]+in[[:space:]]+(the[[:space:]]+)?(diagram|figure)'
        || '|using[[:space:]]+(the[[:space:]]+)?(diagram|figure)'
        || '|figure[[:space:]]+[0-9]+(\.[0-9]+)?[[:space:]]+(shows|is[[:space:]]+shown|represents)'
        || '|following[[:space:]]+flowchart'
        || '|flowchart[[:space:]]+((is[[:space:]]+)?shown|below|above|shows|represents)'
        || '|using[[:space:]]+(the[[:space:]]+)?flowchart'
        || '|following[[:space:]]+graph'
        || '|graph[[:space:]]+((is[[:space:]]+)?shown|below|above|shows|represents)'
        || '|using[[:space:]]+(the[[:space:]]+)?graph'
        || '|(network|tree)[[:space:]]+(diagram[[:space:]]+)?(below[[:space:]]+)?(shows|represents|is[[:space:]]+shown)'
        || '|following[[:space:]]+(bitmap[[:space:]]+)?image'
        || '|image[[:space:]]+((is[[:space:]]+)?shown|below|above)'
        || '|complete.{0,100}(diagram|flowchart|logic[[:space:]]+circuit)'
      )
  )
  SELECT DISTINCT c.question_id,c.rule_code,c.cue
  FROM candidates c
  WHERE NOT EXISTS (
    SELECT 1 FROM validation_findings vf
    WHERE vf.ref_table='questions'
      AND vf.ref_id=c.question_id
      AND vf.rule_code=c.rule_code
      AND vf.resolved_at IS NULL
  );

  SELECT count(*) INTO v_findings FROM _broad_source_fidelity_missing;
  SELECT count(DISTINCT question_id) INTO v_questions FROM _broad_source_fidelity_missing;
  SELECT count(DISTINCT m.question_id) INTO v_downgraded
  FROM _broad_source_fidelity_missing m
  JOIN questions q ON q.id=m.question_id
  WHERE q.status='approved';

  INSERT INTO validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT
    m.rule_code,'error','questions',m.question_id,
    CASE m.rule_code
      WHEN 'source_structure_required_but_missing_table' THEN
        'The original Cambridge QP contains a semantically significant table/grid, but no renderable source-faithful structured asset exists on this question/context chain.'
      WHEN 'source_structure_required_but_missing_layout' THEN
        'The original Cambridge QP contains a matching/connection layout, but no renderable source-faithful structured asset exists on this question/context chain.'
      ELSE
        'The original Cambridge QP explicitly contains or references a source visual, but no renderable source-faithful visual asset exists on this question/context chain.'
    END,
    jsonb_build_object('audit','broad-source-fidelity-0112','cue',m.cue)
  FROM _broad_source_fidelity_missing m;

  UPDATE questions q
  SET status=CASE WHEN q.status='approved' THEN 'needs_review'::review_status ELSE q.status END,
      notes=CASE
        WHEN coalesce(q.notes,'') LIKE '%broad-source-fidelity:%' THEN q.notes
        ELSE concat_ws(E'\n',nullif(q.notes,''),
          'broad-source-fidelity: original QP layout/visual must be source-verified before approval.')
      END,
      updated_at=now()
  WHERE EXISTS (
    SELECT 1 FROM _broad_source_fidelity_missing m WHERE m.question_id=q.id
  );

  RAISE NOTICE '0112 broad source fidelity: % new findings across % questions; % moved from approved to needs_review',
    v_findings,v_questions,v_downgraded;
END $$;
