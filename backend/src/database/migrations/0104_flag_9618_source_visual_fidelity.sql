-- 0104_flag_9618_source_visual_fidelity.sql
-- Retroactive safety gate for source-backed 9618 leaves whose wording explicitly
-- depends on a printed diagram/circuit/flowchart/graph/image but whose leaf -> root
-- chain has no renderable diagram/image asset.
--
-- This does NOT infer or change taxonomy. It creates an unresolved validation
-- finding and moves only currently-approved affected leaves to needs_review so
-- they cannot be treated as student-ready until the original QP visual is
-- restored and checked.

DO $$
DECLARE
  v_total integer;
  v_downgraded integer;
BEGIN
  CREATE TEMP TABLE _source_visual_missing(
    question_id uuid PRIMARY KEY,
    display_ref text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_visual_missing(question_id, display_ref)
  WITH RECURSIVE eligible AS (
    SELECT q.id,q.parent_id,q.display_ref,q.stem_md,q.context_md
    FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
    JOIN syllabi sy ON sy.id=sp.syllabus_id AND sy.code='9618'
    WHERE q.marks IS NOT NULL
      AND q.status IN ('approved','needs_review')
  ), chain AS (
    SELECT e.id leaf_id,e.id node_id,e.parent_id
    FROM eligible e
    UNION ALL
    SELECT c.leaf_id,p.id,p.parent_id
    FROM chain c
    JOIN questions p ON p.id=c.parent_id
  )
  SELECT e.id,e.display_ref
  FROM eligible e
  WHERE (coalesce(e.stem_md,'') || E'\n' || coalesce(e.context_md,'')) ~* (
    'following (logic )?circuit'
    || '|(^|[.!?][[:space:]]+|\n)[[:space:]]*(a|the)[[:space:]]+logic[[:space:]]+circuit[[:space:]]+(is[[:space:]]+)?shown'
    || '|circuit shown (below|above)'
    || '|following diagram|diagram (is )?shown|diagram shown (below|above)'
    || '|shown in (the )?(diagram|figure)|figure[[:space:]]+[0-9]+(\.[0-9]+)?[[:space:]]+(shows|is shown)'
    || '|following flowchart|flowchart (is )?shown|flowchart shown (below|above)'
    || '|following graph|graph (is )?shown|graph shown (below|above)'
    || '|following (bitmap )?image|image (is )?shown|image shown (below|above)'
    || '|complete (the )?(following )?(diagram|flowchart|logic circuit)'
    || '|complete (the )?(E-R|entity[- ]relationship) diagram'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM chain c
    JOIN question_assets qa ON qa.question_id=c.node_id
    WHERE c.leaf_id=e.id
      AND qa.kind IN ('diagram','image')
      AND (
        nullif(qa.content_md,'') IS NOT NULL
        OR nullif(qa.storage_path,'') IS NOT NULL
        OR nullif(qa.svg_markup,'') IS NOT NULL
      )
  );

  SELECT count(*) INTO v_total FROM _source_visual_missing;
  SELECT count(*) INTO v_downgraded
  FROM _source_visual_missing m
  JOIN questions q ON q.id=m.question_id
  WHERE q.status='approved';

  INSERT INTO validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT
    'source_visual_required_but_missing',
    'error',
    'questions',
    m.question_id,
    'The question explicitly depends on a printed source visual, but no renderable diagram/image asset exists on the question or its ancestor context.',
    jsonb_build_object('displayRef',m.display_ref,'audit','9618-source-visual-fidelity-0104')
  FROM _source_visual_missing m
  WHERE NOT EXISTS (
    SELECT 1 FROM validation_findings vf
    WHERE vf.ref_table='questions'
      AND vf.ref_id=m.question_id
      AND vf.rule_code='source_visual_required_but_missing'
      AND vf.resolved_at IS NULL
  );

  UPDATE questions q
  SET status=CASE WHEN q.status='approved' THEN 'needs_review'::review_status ELSE q.status END,
      notes=CASE
        WHEN coalesce(q.notes,'') LIKE '%source-visual-fidelity:%' THEN q.notes
        ELSE concat_ws(E'\n',nullif(q.notes,''),'source-visual-fidelity: original QP visual required; asset/context must be restored and verified before approval.')
      END,
      updated_at=now()
  FROM _source_visual_missing m
  WHERE q.id=m.question_id;

  RAISE NOTICE '0104 source visual fidelity: % unresolved 9618 leaves, % moved from approved to needs_review',v_total,v_downgraded;
END $$;
