-- Source-backed text representation of 9618/11/M/J/21 Q2(a).
-- Official QP page 5 presents four utility-software boxes on the left and six
-- description boxes on the right for a line-matching task. Preserve every
-- published option without inventing the correct matches.
DO $$
DECLARE target_count integer;
DECLARE expected text := E'| Utility software | Description |\n| --- | --- |\n| Disk formatter | Scans software for errors and repairs the problems |\n| Defragmentation | Moves parts of files so that each file is contiguous in memory |\n| Back-up | Creates a copy of data that is no longer required |\n| Disk repair | Sets up a disk so it is ready to store files |\n|  | Creates a copy of data in case the original is lost |\n|  | Scans for errors in a disk and corrects them |';
BEGIN
  SELECT count(*) INTO target_count
  FROM question_assets qa
  JOIN questions q ON q.id=qa.question_id
  JOIN source_papers sp ON sp.id=q.source_paper_id
  JOIN components c ON c.id=sp.component_id
  WHERE sp.kind='QP'::paper_kind AND sp.year=2021 AND sp.series='MJ'
    AND c.number=1 AND sp.variant=1 AND q.path='2.a'
    AND qa.kind='diagram' AND qa.source_page=5;
  IF target_count<>1 THEN
    RAISE EXCEPTION 'expected exactly one 9618/11/M/J/21 Q2(a) diagram asset, found %',target_count;
  END IF;

  UPDATE question_assets qa SET content_md=expected
  FROM questions q,source_papers sp,components c
  WHERE qa.question_id=q.id AND sp.id=q.source_paper_id AND c.id=sp.component_id
    AND sp.kind='QP'::paper_kind AND sp.year=2021 AND sp.series='MJ'
    AND c.number=1 AND sp.variant=1 AND q.path='2.a'
    AND qa.kind='diagram' AND qa.source_page=5
    AND qa.content_md IS DISTINCT FROM expected;

  IF EXISTS(
    SELECT 1 FROM question_assets qa
    JOIN questions q ON q.id=qa.question_id
    JOIN source_papers sp ON sp.id=q.source_paper_id
    JOIN components c ON c.id=sp.component_id
    WHERE sp.kind='QP'::paper_kind AND sp.year=2021 AND sp.series='MJ'
      AND c.number=1 AND sp.variant=1 AND q.path='2.a'
      AND qa.kind='diagram' AND qa.source_page=5
      AND qa.content_md IS DISTINCT FROM expected
  ) THEN RAISE EXCEPTION 'Q2(a) export representation verification failed'; END IF;
END $$;
