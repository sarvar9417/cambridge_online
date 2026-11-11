-- Cambridge 0478 Hodder 2021 textbook technical tables / illustrations follow-up.
-- Source ledger: docs/hodder-0478-visual-diagram-20261111.csv.
-- Non-Key-Term additions only. Source pages are printed page numbers; PDF=printed+12.
-- Intentionally keeps the book's explicit A-Level Extension material out of Core.
-- Insert is idempotent and does not change 9618 or existing official entries.
WITH src(ch,section_code,printed_page,term,definition_en,is_extension) AS (VALUES
    (2,'2.1.3',53,'USB hub','A device that provides additional USB connection points or helps extend a USB connection beyond a standard cable length.',false),
    (2,'2.3.1',67,'photon','A particle of light whose quantum properties, including polarisation, can be used in quantum key distribution.',true),
    (2,'2.3.1',67,'photon polarisation','The restriction of a photon''s light vibrations to particular directions, used to represent and measure quantum information.',true),
    (2,'2.3.1',67,'BB84 key-distribution protocol','A quantum key distribution method that uses randomly chosen polarisation bases and later compares basis choices.',true),
    (3,'3.1.5',85,'set-top box','A television accessory containing an embedded computer system that manages receiving, recording and playing television content.',false),
    (3,'3.2.1',92,'photodiode','A light-sensitive semiconductor component that converts incoming light into an electrical signal.',false),
    (3,'3.2.1',97,'3D scanner','An input device that measures a solid object from multiple spatial directions to build a digital three-dimensional model.',false),
    (3,'3.2.2',102,'LCD projector','A projector that uses liquid-crystal display technology to form an image and project it onto a larger surface.',false),
    (3,'3.2.3',111,'analogue data','Data representing a physical quantity that changes continuously rather than taking only discrete values.',false),
    (3,'3.2.3',111,'digital data','Data represented by discrete values, typically binary digits, so a computer can process it.',false),
    (3,'3.2.3',112,'active infrared sensor','A sensor that transmits and detects an infrared beam and reacts when an object interrupts the beam.',false),
    (3,'3.2.3',112,'passive infrared sensor','A sensor that detects infrared heat radiation emitted by nearby objects without needing to transmit a beam.',false),
    (4,'4.1.1',150,'program code module','A separately developed section of source code that can be combined with other modules to make a complete program.',false),
    (5,'5.1.5',183,'web server','A computer or service that hosts website files and supplies requested web pages to browsers over a network.',false),
    (6,'6.1.1',218,'microprocessor (automated system)','A programmable processing component that interprets sensor readings and determines control signals for output devices or actuators.',false),
    (7,'7.9',293,'stack top pointer','An index or address identifying the current top item of a stack; it changes when items are pushed or popped.',true),
    (7,'7.9',293,'stack base pointer','An index or address identifying the base of a stack, remaining fixed during the stack operations illustrated in the book.',true),
    (7,'7.9',293,'queue front pointer','An index or address identifying the next queue item to be removed by a dequeue operation.',true),
    (7,'7.9',293,'queue end pointer','An index or address identifying the rear of a queue, updated as new items are enqueued.',true)
), mapped AS (
 SELECT src.*, st.id subtopic_id, bs.id book_section_id
 FROM src
 JOIN public.hodder_book_sections bs ON bs.chapter_number=src.ch AND bs.section_code=src.section_code
 JOIN public.syllabi sy ON sy.id=bs.syllabus_id AND sy.code='0478' AND sy.version_label='2026-2028'
 JOIN public.topics t ON t.syllabus_id=sy.id AND t.number=src.ch
 JOIN LATERAL (SELECT st.id FROM public.subtopics st WHERE st.topic_id=t.id AND
 (st.code=src.section_code OR src.section_code LIKE st.code||'.%' OR st.code=src.ch::text)
 ORDER BY length(st.code) DESC LIMIT 1) st ON true
), added AS (
 INSERT INTO public.glossary_terms
 (subtopic_id,term,definition_en,source_ref,status,is_official_key_term,definition_evidence_status)
 SELECT m.subtopic_id,m.term,m.definition_en,
 'Hodder 2021 ISBN 9781398318281; Chapter '||m.ch||
 '; subsection '||m.section_code||'; printed p.'||m.printed_page||
 '; PDF p.'||(m.printed_page+12)||
 '; text/table/figure audit'||
 CASE WHEN m.is_extension THEN '; EXTENSION (not core 0478 syllabus)' ELSE '' END,
 'approved',false,
 CASE WHEN m.is_extension THEN 'supplementary_source_screened'
 ELSE 'supplementary_targeted_verified' END
 FROM mapped m WHERE NOT EXISTS (
 SELECT 1 FROM public.glossary_terms gt
 JOIN public.subtopics st ON st.id=gt.subtopic_id
 JOIN public.topics t ON t.id=st.topic_id
 WHERE t.syllabus_id=(SELECT id FROM public.syllabi
 WHERE code='0478' AND version_label='2026-2028')
 AND t.number=m.ch AND lower(trim(gt.term))=lower(trim(m.term)))
 RETURNING id,term
)
INSERT INTO public.hodder_glossary_section_links(glossary_term_id,book_section_id)
SELECT added.id,mapped.book_section_id FROM added JOIN mapped ON added.term=mapped.term
ON CONFLICT DO NOTHING;
