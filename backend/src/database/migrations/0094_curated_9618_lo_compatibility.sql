-- Curated Cambridge 9618 cross-version compatibility for 2026-2028 subtopic practice.
--
-- `equivalent` is reserved for genuinely interchangeable LO scope.
-- `subtopic_compatible` is used when the historical LO is a safe subset/superset
-- of the current LO but remains wholly inside the same Cambridge subtopic. The
-- practice selector works at subtopic level, so this is safe for question choice
-- without pretending that the two LOs are identical for mastery reporting.

ALTER TABLE public.learning_objective_compatibility
  DROP CONSTRAINT IF EXISTS learning_objective_compatibility_relation_check;
ALTER TABLE public.learning_objective_compatibility
  ADD CONSTRAINT learning_objective_compatibility_relation_check
  CHECK (relation IN ('equivalent','subtopic_compatible','excluded'));

WITH curated(target_code,source_code,relation,rationale) AS (
  VALUES
    ('1.2.1','1.2-lo-01','equivalent','Bitmap representation/storage wording modernised.'),
    ('1.3.1','1.3-lo-01','equivalent','Need for compression retained; current LO adds examples.'),
    ('1.3.2','1.3-lo-02','subtopic_compatible','Current LO combines lossy/lossless distinction with choice/justification.'),
    ('1.3.2','1.3-lo-03','subtopic_compatible','Current LO combines lossy/lossless distinction with choice/justification.'),
    ('1.3.3','1.3-lo-04','subtopic_compatible','RLE is a historical compression method inside the current file-compression LO.'),

    ('3.1.3','3.1-lo-06','equivalent','Principal operations of hardware devices retained.'),
    ('3.1.4','3.1-lo-07','equivalent','Purpose and use of buffers retained.'),
    ('4.1.2','4.1-lo-02','equivalent','Von Neumann register roles retained.'),
    ('4.1.3','4.1-lo-03','equivalent','Processor component roles retained.'),
    ('4.2.4','4.2-lo-05','equivalent','Tracing assembly is the current wording for dry-running assembly.'),
    ('4.3.1','4.3-lo-01','equivalent','Binary shifts retained.'),
    ('5.1.4','5.1-lo-05','equivalent','Program-library purpose and benefits retained.'),
    ('5.2.1','5.2-lo-01','equivalent','Assembler/compiler/interpreter purpose retained.'),
    ('5.2.2','5.2-lo-02','equivalent','Compiler/interpreter choice and benefits retained.'),

    ('6.1.2','6.1-lo-03','subtopic_compatible','Historical LO enumerates the security measures covered by the current broader LO.'),
    ('6.1.3','6.1-lo-04','equivalent','Network/internet security threats retained.'),
    ('6.1.4','6.1-lo-05','equivalent','Risk-reduction methods retained.'),
    ('6.1.5','6.1-lo-06','equivalent','Data-protection methods retained.'),
    ('6.2.2','6.2-lo-01','subtopic_compatible','Historical validation routines are the methods required by the current LO.'),
    ('6.2.3','6.2-lo-03','equivalent','Verification during entry/transfer retained.'),
    ('7.1.1','7.1-lo-01','subtopic_compatible','Historical LO combines need for ethics and acting ethically.'),
    ('7.1.2','7.1-lo-01','subtopic_compatible','Historical LO combines need for ethics and acting ethically.'),
    ('7.1.4','7.1-lo-04','subtopic_compatible','Historical licensing LO supplies the licence features inside the current broader judgement LO.'),

    ('8.1.2','8.1-lo-02','equivalent','Relational-database features addressing file limitations retained.'),
    ('8.1.5','8.1-lo-04','subtopic_compatible','Historical normalisation process maps to current 1NF/2NF/3NF understanding.'),
    ('8.1.7','8.1-lo-05','equivalent','Producing a normalised design retained.'),
    ('8.2.2','8.2-lo-02','equivalent','DBMS features/software tools retained.'),
    ('8.3.5','8.3-lo-02','subtopic_compatible','Historical LO combines DDL and DML scripting; current syllabus splits them.'),
    ('8.3.6','8.3-lo-02','subtopic_compatible','Historical LO combines DDL and DML scripting; current syllabus splits them.'),

    ('9.1.1','9.1-lo-01','subtopic_compatible','Historical LO combines understanding, purpose and need for abstraction.'),
    ('9.1.2','9.1-lo-01','subtopic_compatible','Historical LO combines understanding, purpose and need for abstraction.'),
    ('9.1.3','9.1-lo-03','subtopic_compatible','Historical decomposition purpose is compatible with current decomposition use.'),
    ('9.2.3','9.2-lo-02','equivalent','Input/process/output pseudocode retained.'),
    ('9.2.4','9.2-lo-03','subtopic_compatible','Historical LO combines assignment, sequence, selection, repetition and logic.'),
    ('9.2.8','9.2-lo-07','equivalent','Stepwise refinement retained.'),

    ('10.4.1','10.4-lo-01','equivalent','ADT definition retained.'),
    ('10.4.2','10.4-lo-02','equivalent','Stack/queue/linked-list examples retained.'),
    ('10.4.4','10.4-lo-03','equivalent','Using stack/queue/linked-list to store data retained.'),
    ('10.4.5','10.4-lo-04','equivalent','Array implementation of stack/queue/linked-list retained.'),
    ('11.1.2','11.1-lo-04','subtopic_compatible','Historical expression statements are one explicit part of the current combined basics LO.'),
    ('11.3.1','11.3-lo-01','subtopic_compatible','Historical LO combines procedure and function; current syllabus splits them.'),
    ('11.3.2','11.3-lo-01','subtopic_compatible','Historical LO combines procedure and function; current syllabus splits them.'),
    ('11.3.6','11.3-lo-03','equivalent','Parameter use retained.'),

    ('12.1.1','12.1-lo-01','equivalent','Purpose of development life cycle retained.'),
    ('12.1.4','12.1-lo-04','equivalent','Program-development stages retained.'),
    ('12.2.1','12.2-lo-01','equivalent','Structure-chart decomposition and parameters retained.'),
    ('12.2.2','12.2-lo-02','subtopic_compatible','Historical LO requires creating/using state-transition diagrams; current LO asks understanding of their purpose.'),
    ('12.3.1','12.3-lo-01','equivalent','Exposing/avoiding program faults retained.'),
    ('12.3.2','12.3-lo-04','subtopic_compatible','Historical testing-method LO is inside the current broader testing-method/data LO.'),

    ('13.2.1','13.2-lo-01','subtopic_compatible','Current LO combines file organisation understanding with selection.'),
    ('13.2.1','13.2-lo-03','subtopic_compatible','Current LO combines file organisation/access selection in one statement.'),
    ('13.2.2','13.2-lo-02','equivalent','File-access methods retained.'),
    ('13.2.3','13.2-lo-04','equivalent','Hashing algorithms retained.'),
    ('14.1.4','14.1-lo-04','equivalent','Named application protocols and purposes retained.'),
    ('14.2.1','14.2-lo-01','subtopic_compatible','Historical LO combines circuit and packet switching in one statement.'),
    ('14.2.2','14.2-lo-01','subtopic_compatible','Historical LO combines circuit and packet switching in one statement.'),

    ('15.1.1','15.1-lo-01','equivalent','RISC/CISC retained.'),
    ('15.1.2','15.1-lo-02','equivalent','RISC pipelining/registers retained.'),
    ('15.1.3','15.1-lo-03','equivalent','Four processor architectures retained.'),
    ('15.1.4','15.1-lo-04','equivalent','Massively parallel computers retained.'),
    ('15.1.5','15.1-lo-05','subtopic_compatible','Historical VM LO combines concept, benefits and limitations.'),
    ('15.1.6','15.1-lo-05','subtopic_compatible','Historical VM LO combines concept, benefits and limitations/roles.'),
    ('16.1.2','16.1-lo-02','equivalent','UI hiding hardware complexity retained.'),
    ('16.1.3','16.1-lo-03','equivalent','OS process management retained.'),
    ('16.1.4','16.1-lo-04','equivalent','Virtual memory, paging and segmentation retained.'),
    ('16.2.2','16.2-lo-02','equivalent','Compilation stages retained.'),
    ('16.2.3','16.2-lo-03','subtopic_compatible','Historical LO applies BNF/syntax diagrams; current LO asks understanding of the same grammar representation.'),
    ('16.2.4','16.2-lo-04','subtopic_compatible','Historical LO applies RPN; current LO asks understanding of its evaluation use.'),

    ('17.1.1','17.1-lo-02','subtopic_compatible','Symmetric/asymmetric encryption is the historical concrete scope of current encryption understanding.'),
    ('17.1.2','17.1-lo-03','equivalent','SSL/TLS purpose and use retained.'),
    ('17.1.3','17.1-lo-04','equivalent','Digital certificates retained.'),
    ('18.1.1','18.1-lo-01','equivalent','Graphs used to aid AI retained.'),
    ('18.1.2','18.1-lo-03','equivalent','Neural networks and machine learning retained.'),
    ('18.1.3','18.1-lo-04','equivalent','Deep/machine/reinforcement learning retained.'),
    ('18.1.5','18.1-lo-05','equivalent','Back propagation and regression retained.'),
    ('19.1.1','19.1-lo-02','subtopic_compatible','Historical LO requires implementation of the searches the current LO requires understanding.'),
    ('19.2.1','19.2-lo-01','equivalent','Recursion features retained.'),
    ('19.2.1','19.2-lo-02','subtopic_compatible','Writing/tracing recursion is application within the current recursion subtopic.'),
    ('19.2.2','19.2-lo-04','equivalent','Compiler treatment of recursive code retained.'),
    ('20.1.1','20.1-lo-04','subtopic_compatible','Historical OOP terminology is evidence for one programming paradigm in the current broader paradigms LO.')
), resolved AS (
  SELECT target_lo.id target_lo_id, source_lo.id source_lo_id, c.relation,
         'curated-2026-vs-2021-2025: ' || c.rationale AS evidence
  FROM curated c
  JOIN public.learning_objectives target_lo ON target_lo.code=c.target_code
  JOIN public.subtopics target_st ON target_st.id=target_lo.subtopic_id
  JOIN public.topics target_t ON target_t.id=target_st.topic_id
  JOIN public.syllabi target_s ON target_s.id=target_t.syllabus_id
    AND target_s.code='9618' AND target_s.version_label='2026-2028'
  JOIN public.learning_objectives source_lo ON source_lo.code=c.source_code
  JOIN public.subtopics source_st ON source_st.id=source_lo.subtopic_id
  JOIN public.topics source_t ON source_t.id=source_st.topic_id
  JOIN public.syllabi source_s ON source_s.id=source_t.syllabus_id
    AND source_s.code='9618' AND source_s.version_label IN ('2021-2023','2024-2025')
  WHERE target_t.number=source_t.number AND target_st.code=source_st.code
)
INSERT INTO public.learning_objective_compatibility(target_lo_id,source_lo_id,relation,evidence)
SELECT target_lo_id,source_lo_id,relation,evidence FROM resolved
ON CONFLICT (target_lo_id,source_lo_id) DO UPDATE
SET relation=EXCLUDED.relation,evidence=EXCLUDED.evidence;

-- Compatibility coverage is a taxonomy invariant. Practice readiness remains a
-- separate corpus/renderability metric and is intentionally not asserted here.
DO $$
DECLARE mapped_subtopics int;
BEGIN
  SELECT count(DISTINCT target_lo.subtopic_id) INTO mapped_subtopics
  FROM public.learning_objective_compatibility c
  JOIN public.learning_objectives target_lo ON target_lo.id=c.target_lo_id
  JOIN public.subtopics st ON st.id=target_lo.subtopic_id
  JOIN public.topics t ON t.id=st.topic_id
  JOIN public.syllabi s ON s.id=t.syllabus_id
  WHERE s.code='9618' AND s.version_label='2026-2028'
    AND c.relation IN ('equivalent','subtopic_compatible');
  IF mapped_subtopics<>44 THEN
    RAISE EXCEPTION 'curated 9618 compatibility incomplete: mapped_subtopics=% expected=44',mapped_subtopics;
  END IF;
END $$;
