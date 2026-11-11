-- Cambridge 0478 Hodder 2021 textbook deep Index + table/diagram follow-up.
-- Source evidence ledger: docs/hodder-0478-deep-index-20261111.csv.
-- 35 curated non-Key-Term entries with printed page / PDF page / section identity.
-- Source-specific AI nomenclature and out-of-syllabus Extension material are
-- intentionally source-screened for the Extended game bank only.
-- Idempotent: do not change or duplicate any existing chapter term.
WITH source(ch,section_code,term,definition_en,printed_page,is_extension,context_limited) AS (VALUES
    (1,'1.2.1','hertz (Hz)','A unit of frequency meaning one event per second; sound sampling rates are expressed in samples per second.',30,false,false),
    (2,'2.2','ISBN-13 check digit','The final digit of a 13-digit ISBN, calculated from the other twelve digits to help detect entry errors.',60,false,false),
    (2,'2.2','modulo-11 check-digit method','An error-checking procedure in which a weighted calculation produces a check digit using division by eleven.',61,false,false),
    (3,'3.2.1','barcode scanner','An input device that illuminates and senses the dark and light bars of a barcode and converts the pattern to digital data.',88,false,false),
    (3,'3.2.1','digital camera','An input device that captures light electronically, converts sensor readings to digital values and stores image data.',92,false,false),
    (3,'3.2.1','RGB colour model','A way to describe a pixel colour using separate red, green and blue component values, commonly eight bits per channel.',93,false,false),
    (3,'3.2.1','microphone','An input device that converts sound-wave vibrations into electrical signals that can be digitised.',94,false,false),
    (3,'3.2.2','3D printer','An output device that produces a physical three-dimensional object by building it up in successive material layers.',106,false,false),
    (3,'3.2.2','additive manufacturing','Making a three-dimensional object by adding material in layers rather than removing material from a solid block.',106,false,false),
    (3,'3.2.3','acoustic sensor','A sensor that responds to sound and converts detected noise into an electrical signal.',112,false,false),
    (3,'3.2.3','gas sensor','A sensor that measures the presence or concentration of a gas such as oxygen or carbon dioxide.',112,false,false),
    (3,'3.2.3','proximity sensor','A sensor that detects whether an object is nearby without requiring physical contact.',112,false,false),
    (3,'3.2.3','flow-rate sensor','A sensor that measures the rate at which a liquid or gas passes a measuring point.',112,false,false),
    (3,'3.2.3','level sensor','A sensor that determines the level of a material such as a liquid in a tank, using ultrasonic or other detection methods.',112,false,false),
    (3,'3.2.3','anti-lock braking system (ABS)','A vehicle braking control system that monitors wheel rotation and adjusts braking to reduce wheel lock-up.',115,false,false),
    (3,'3.4','Wi-Fi','A wireless technology that connects devices over a local network using radio-based data transmission.',139,true,false),
    (3,'3.4.4','network switch','A local-network device that forwards incoming data toward the intended device, using destination hardware addressing.',137,false,false),
    (4,'4.1.1','linker (link editor)','A program that combines separately compiled object files or modules into one executable program.',150,false,false),
    (4,'4.1.1','object code','Code output by a compiler before or during creation of an executable program from source code.',150,false,false),
    (5,'5.3.1','ethical hacking','Security testing in which authorised specialists attempt to find weaknesses in a computer system.',191,false,false),
    (5,'5.3.1','keylogging software','Software that records a user''s key presses, potentially collecting credentials or other sensitive information.',194,false,false),
    (6,'6.3.1','narrow AI (Hodder classification)','In the textbook''s categorisation, AI that outperforms a human on one specific task.',241,false,true),
    (6,'6.3.1','general AI (Hodder classification)','In the textbook''s categorisation, AI with human-comparable performance on a specific task; this differs from some wider AI terminology.',241,false,true),
    (6,'6.3.1','strong AI (Hodder classification)','In the textbook''s categorisation, AI that outperforms humans on multiple tasks; this is source-specific wording.',241,false,true),
    (7,'7.9','Abstract Data Type (ADT)','A specification of a collection of data together with operations that can be performed on that data.',292,true,false),
    (7,'7.9','stack (LIFO)','A data structure that removes its most recently added item first, following Last In First Out order.',292,true,false),
    (7,'7.9','queue (FIFO)','A data structure that removes its earliest added item first, following First In First Out order.',292,true,false),
    (7,'7.9','push operation','The operation that places a new item onto the top of a stack.',292,true,false),
    (7,'7.9','pop operation','The operation that removes the item at the top of a stack.',292,true,false),
    (7,'7.9','enqueue operation','The operation that inserts a new item at the rear of a queue.',292,true,false),
    (7,'7.9','dequeue operation','The operation that removes the front item of a queue.',292,true,false),
    (8,'8.1.8','program comment','Explanatory text in source code intended for programmers, not as an instruction executed by the computer.',329,false,false),
    (8,'8.1.2','string concatenation','Joining two or more strings together to form one string.',304,false,false),
    (9,'9.1.4','relational database','A database in which information is organised in multiple related tables, rather than one isolated table.',352,true,false),
    (10,'10.3','NAND as a universal gate','The ability to build any of the basic logic functions using combinations of NAND gates alone.',378,true,false)
), mapped AS (
 SELECT source.*,st.id subtopic_id, bs.id book_section_id
 FROM source
 JOIN public.hodder_book_sections bs ON bs.chapter_number=source.ch AND bs.section_code=source.section_code
 JOIN public.syllabi sy ON sy.id=bs.syllabus_id AND sy.code='0478' AND sy.version_label='2026-2028'
 JOIN public.topics topic ON topic.syllabus_id=sy.id AND topic.number=source.ch
 JOIN LATERAL (
   SELECT id FROM public.subtopics st WHERE st.topic_id=topic.id AND
   (st.code=source.section_code OR source.section_code LIKE st.code||'.%' OR st.code=source.ch::text)
   ORDER BY length(st.code) DESC LIMIT 1
 ) st ON true
),
created AS (
 INSERT INTO public.glossary_terms
 (subtopic_id,term,definition_en,source_ref,status,is_official_key_term,definition_evidence_status)
 SELECT m.subtopic_id,m.term,m.definition_en,
   'Hodder 2021 ISBN 9781398318281; Chapter '||m.ch||
   '; subsection '||m.section_code||
   '; printed p.'||m.printed_page||
   '; PDF p.'||(m.printed_page+12)||
   '; Index-and-body audit (table/diagram/inline)'||
   CASE WHEN m.is_extension THEN '; EXTENSION (outside core 0478 syllabus)' ELSE '' END||
   CASE WHEN m.context_limited THEN '; SOURCE-BOUND terminology (Hodder 2021 classification, not a universal AI definition)' ELSE '' END,
   'approved',false,
   CASE WHEN m.is_extension OR m.context_limited
      THEN 'supplementary_source_screened'
      ELSE 'supplementary_targeted_verified' END
 FROM mapped m
 WHERE NOT EXISTS (
 SELECT 1 FROM public.glossary_terms existing
 JOIN public.subtopics st ON st.id=existing.subtopic_id
 JOIN public.topics t ON t.id=st.topic_id
 WHERE t.syllabus_id=(SELECT id FROM public.syllabi WHERE code='0478' AND version_label='2026-2028')
   AND t.number=m.ch AND lower(trim(existing.term))=lower(trim(m.term))
 )
 RETURNING id,term
)
INSERT INTO public.hodder_glossary_section_links(glossary_term_id,book_section_id)
SELECT c.id,m.book_section_id FROM created c JOIN mapped m ON c.term=m.term
ON CONFLICT DO NOTHING;
