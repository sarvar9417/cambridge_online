-- Persist source-verified decisions for same-shape Cambridge variant pairs that
-- are NOT content-equivalent. This prevents them from repeatedly surfacing as
-- unresolved canonicalization candidates while keeping fail-closed evidence.

CREATE TABLE IF NOT EXISTS public.source_paper_distinctness_reviews(
  paper_a_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE CASCADE,
  paper_b_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE CASCADE,
  result text NOT NULL CHECK(result='distinct_content'),
  verified_at timestamptz NOT NULL DEFAULT now(),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(paper_a_id,paper_b_id),
  CHECK(paper_a_id<paper_b_id)
);

REVOKE ALL ON public.source_paper_distinctness_reviews FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.source_paper_distinctness_reviews TO service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      (4,2021,'ON',1,2,
       jsonb_build_object(
         'sourceVerified',true,
         'verificationMethod','drive_qp_semantic_text_and_rendered_source_comparison',
         'qpA','9618_w21_qp_41.pdf','qpB','9618_w21_qp_42.pdf',
         'difference','assessed pseudocode differs: OUTPUT("Tree is full") versus OUTPUT "Tree is full"',
         'verifiedOn','2026-09-07'
       )),
      (2,2024,'MJ',1,2,
       jsonb_build_object(
         'sourceVerified',true,
         'verificationMethod','drive_qp_semantic_content_comparison',
         'qpA','9618_s24_qp_21.pdf','qpB','9618_s24_qp_22.pdf',
         'difference','assessed question content is materially different across the papers',
         'verifiedOn','2026-09-07'
       )),
      (1,2026,'MJ',1,3,
       jsonb_build_object(
         'sourceVerified',true,
         'verificationMethod','drive_qp_semantic_content_comparison',
         'qpA','9618_s26_qp_11.pdf','qpB','9618_s26_qp_13.pdf',
         'difference','assessed question content is materially different across the papers',
         'verifiedOn','2026-09-07'
       )),
      (3,2026,'MJ',2,3,
       jsonb_build_object(
         'sourceVerified',true,
         'verificationMethod','drive_qp_semantic_content_comparison',
         'qpA','9618_s26_qp_32.pdf','qpB','9618_s26_qp_33.pdf',
         'difference','assessed question content is materially different across the papers',
         'verifiedOn','2026-09-07'
       ))
    ) v(component,year,series,variant_a,variant_b,evidence)
  LOOP
    INSERT INTO public.source_paper_distinctness_reviews(paper_a_id,paper_b_id,result,verified_at,evidence)
    SELECT least(a.id,b.id),greatest(a.id,b.id),'distinct_content',now(),r.evidence
    FROM public.source_papers a
    JOIN public.source_papers b
      ON b.syllabus_id=a.syllabus_id
     AND b.component_id=a.component_id
     AND b.year=a.year AND b.series=a.series AND b.kind=a.kind
    JOIN public.syllabi s ON s.id=a.syllabus_id
    JOIN public.components c ON c.id=a.component_id
    WHERE s.code='9618' AND c.number=r.component
      AND a.year=r.year AND a.series::text=r.series
      AND a.variant=r.variant_a AND b.variant=r.variant_b
      AND a.kind='QP'::paper_kind
      AND a.source_url IS NOT NULL AND b.source_url IS NOT NULL
    ON CONFLICT(paper_a_id,paper_b_id) DO UPDATE
    SET result=excluded.result,verified_at=excluded.verified_at,evidence=excluded.evidence;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'distinctness review source pair not found: C% % % v%/v%',
        r.component,r.year,r.series,r.variant_a,r.variant_b;
    END IF;
  END LOOP;
END $$;

-- Every current same-session physical pair with the same structural shape must now
-- have a source-verified decision: either canonical exact equivalence (whose alias
-- tree has already been removed) or an explicit distinct-content review.
DO $$
DECLARE
  v_unreviewed integer;
BEGIN
  WITH p AS (
    SELECT sp.id,s.code syllabus,c.number component,sp.year,sp.series::text series,sp.variant,
           count(q.id)::int nodes,
           count(q.id) FILTER(WHERE q.marks IS NOT NULL)::int leaves,
           coalesce(sum(q.marks) FILTER(WHERE q.marks IS NOT NULL),0)::int marks
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    JOIN public.questions q ON q.source_paper_id=sp.id
    WHERE s.code='9618' AND sp.kind='QP'::paper_kind
      AND sp.source_url IS NOT NULL AND sp.variant BETWEEN 1 AND 3
    GROUP BY sp.id,s.code,c.number,sp.year,sp.series,sp.variant
  ), candidates AS (
    SELECT least(a.id,b.id) paper_a_id,greatest(a.id,b.id) paper_b_id
    FROM p a JOIN p b
      ON a.syllabus=b.syllabus AND a.component=b.component
     AND a.year=b.year AND a.series=b.series
     AND a.nodes=b.nodes AND a.leaves=b.leaves AND a.marks=b.marks
     AND a.variant<b.variant
  )
  SELECT count(*) INTO v_unreviewed
  FROM candidates x
  WHERE NOT EXISTS(
    SELECT 1 FROM public.source_paper_distinctness_reviews r
    WHERE r.paper_a_id=x.paper_a_id AND r.paper_b_id=x.paper_b_id
      AND r.result='distinct_content' AND coalesce((r.evidence->>'sourceVerified')::boolean,false)
  );

  IF v_unreviewed<>0 THEN
    RAISE EXCEPTION 'unreviewed same-shape 9618 source variant candidates: %',v_unreviewed;
  END IF;
END $$;
