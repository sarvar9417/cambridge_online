-- Reproducible, idempotent Cambridge 0478 Hodder inline concept additions.
-- Source: user's 403-page Hodder 2021 textbook (ISBN 9781398318281);
-- editorial review and term ledger: docs/hodder-0478-inline-glossary-20261111.csv.
-- The official textbook Key Terms remain separate. Extension material is not
-- part of the core 0478 curriculum bank (supplementary_source_screened).
-- Run after the 0478 2026–2028 syllabus, subtopics and Hodder sections exist.
WITH source(chapter_number, section_code, term, definition_en, printed_page, is_extension) AS (
  VALUES
    (1,'1.1.4','binary addition','Adding binary digits using base-two rules, passing a carry to the next column when a column total is two or more.',15,false),
    (1,'1.1.5','least significant bit (LSB)','The rightmost bit in a binary number; it carries the smallest place value.',18,false),
    (1,'1.1.5','most significant bit (MSB)','The leftmost bit in a binary number; in a positive positional binary value it carries the greatest place value.',18,false),
    (1,'1.2.1','sound sampling','Measuring the amplitude of an analogue sound wave at regular intervals so the readings can be represented digitally.',29,false),
    (1,'1.3.2','image file size calculation','For an uncompressed bitmap, the size in bits is the total number of image pixels multiplied by the colour depth in bits per pixel.',33,false),
    (1,'1.3.2','sound file size calculation','The size in bits of uncompressed mono sound is sampling rate multiplied by sampling resolution and duration; stereo uses twice this value.',33,false),
    (1,'1.1.2','Binary Coded Decimal (BCD)','A representation in which each denary digit from 0 to 9 is encoded separately using four binary bits.',38,true),
    (1,'1.1.6','binary subtraction using two’s complement','Subtracting one binary value by adding its two’s-complement representation to the other binary value.',38,true),
    (2,'2.1.3','USB-C','A 24-pin symmetrical and reversible USB connector that supports transferring data and supplying electrical power.',53,false),
    (2,'2.3.1','quantum cryptography','An approach to securing transmitted information using physical quantum properties of photons, particularly in exchanging encryption keys.',67,true),
    (2,'2.3.1','Quantum Key Distribution (QKD)','A technique that uses quantum-mechanical properties to distribute encryption keys securely between communicating parties.',67,true),
    (2,'2.3.1','qubit','The basic unit of quantum information, able to represent a superposition of binary states until measurement.',67,true),
    (3,'3.3.3','disk sector','A subdivision of a disk track that stores a fixed amount of data.',124,false),
    (3,'3.3.3','disk track','A circular path on a magnetic disk platter where data is organised into sectors.',124,false),
    (3,'3.3.3','flash memory','An electronically rewritable non-volatile storage technology that retains data as charge in floating-gate transistor cells.',124,false),
    (3,'3.3.3','read-write head','An electromagnetic component of a hard disk drive used to read data from or write data to its platters.',124,false),
    (3,'3.3.3','removable hard disk drive','An external hard disk drive that can connect to a computer, for example via USB, for backup or transfer of files.',124,false),
    (3,'3.3.3','control-gate transistor','A transistor structure in a flash-memory cell to which voltage is applied to control the charge on the floating gate.',125,false),
    (3,'3.3.3','floating-gate transistor','A transistor in a flash-memory cell that retains electrical charge to represent stored binary information.',125,false),
    (3,'3.4.3','internet service provider (ISP)','An organisation that provides connectivity to the internet and typically supplies customers with internet-facing IP addresses.',134,false),
    (3,'3.4.3','network protocol','An agreed set of rules governing how devices communicate and exchange data across a network.',134,false),
    (3,'3.4.3','private IP address','An address used to identify a device within a private network; it is unique within that network but may be reused on another private network.',134,false),
    (3,'3.4.3','public IP address','An internet-facing IP address assigned to a router or network connection that identifies it on the public internet.',134,false),
    (3,'3.4.3','File Transfer Protocol (FTP) server','A server used to transfer files to or from computers across a network.',136,false),
    (3,'3.4','Bluetooth','A wireless communications technology that connects nearby devices using radio signals, with channels around 2.45 GHz.',139,true),
    (4,'4.1.1','File History utility','A Windows backup feature that periodically stores snapshots of files so earlier versions can be recovered.',153,false),
    (4,'4.1.1','restore point','A saved earlier state of a computer system that can be used to return it to that state after a problem.',153,false),
    (4,'4.1.1','Time Machine utility','A macOS backup facility that makes scheduled copies of files to an external storage device for later recovery.',153,false),
    (4,'4.1.1','security software','System utility software that protects a computer by managing access, cooperating with malware protection and firewalls, and supporting encryption and updates.',154,false),
    (5,'5.3.2','fingerprint scan','A biometric identification method that captures a fingerprint image and compares it with a previously stored fingerprint.',201,false),
    (5,'5.3.2','face recognition','A biometric method that compares facial characteristics with previously recorded facial information to identify or verify a person.',202,false),
    (5,'5.3.2','retina scan','A biometric identification method using a pattern in the eye to check a person''s identity.',202,false),
    (5,'5.3.2','software security update','An update installed to address vulnerabilities and improve the protection of a computer''s software.',204,false),
    (5,'5.3.2','Transport Layer Security (TLS)','A network security protocol that protects communications by providing encryption, authentication and data integrity; the book describes it as a successor to SSL.',211,true),
    (6,'6.3.1','deductive reasoning (Hodder AI usage)','The book describes forming rules from known facts and applying those rules to new situations; its terminology differs from standard formal-logic usage.',241,true),
    (6,'6.3.1','reasoning','The ability of an AI system to draw conclusions from supplied facts or situations.',241,false),
    (6,'6.3.1','Turing Test','A method for assessing whether a machine can exhibit responses comparable to human intelligence.',242,true),
    (6,'6.3.1','artificial neural network','A model built from connected processing units arranged in input, hidden and output layers, inspired by connections between neurons.',250,true),
    (6,'6.3.1','deep learning','A form of machine learning that uses multiple layers of processing in artificial neural networks to learn patterns from data.',250,true),
    (7,'7.1.1','requirements specification','A statement agreed during program analysis that sets out what a proposed solution must achieve and the requirements it must meet.',258,false),
    (7,'7.2.1','computer system','A combination of hardware, software, data, communication and people that works together, often as smaller subsystems.',260,false),
    (7,'7.2.3','assignment statement','A pseudocode or programming statement that stores the value of an expression into a named variable.',265,false),
    (7,'7.2.3','conditional statement','A statement that selects which action to perform according to whether a condition is true or which of several values is matched.',266,false),
    (7,'7.2.3','comparison operator','An operator such as >, <, = or <> that compares values and produces a Boolean result.',267,false),
    (8,'8.1.2','Boolean data type','A basic data type whose value is either TRUE or FALSE.',304,false),
    (8,'8.1.3','input statement','A programming statement that obtains data from a source such as the keyboard for use by the program.',304,false),
    (8,'8.1.3','output statement','A programming statement that sends information or a result to a destination such as the screen.',305,false),
    (8,'8.1.4','pre-condition loop','A repetition structure that tests its condition before executing the loop body, so the body may run zero times.',313,false),
    (8,'8.1.4','post-condition loop','A repetition structure that tests its condition after executing the loop body, so the body runs at least once.',314,false),
    (8,'8.1.4','string handling','Operations that process strings of characters, for example finding length or extracting a substring.',315,false),
    (9,'9.1.4','Data Definition Language (DDL)','Statements used to create, alter and remove relational database structures.',352,true),
    (9,'9.1.4','Data Manipulation Language (DML)','Statements used to insert, modify, delete and retrieve the data stored in a relational database.',352,true),
    (9,'9.1.4','Database Management System (DBMS)','Software used to define, manage, access and modify information in a database.',352,true),
    (10,'10.3','XNOR gate','A logic gate that outputs 1 when its two binary inputs are equal, and 0 when they differ.',378,true),
    (10,'10.3','carry bit','An output from binary addition that is carried into the next more significant bit position.',379,true),
    (10,'10.3','half adder','A logic circuit that adds two one-bit binary inputs and produces a sum bit and a carry bit.',379,true),
    (10,'10.3','sum bit','The output bit representing the sum at a single binary position in an adder circuit.',379,true),
    (10,'10.3','full adder','A binary addition circuit that adds two input bits and an incoming carry bit, giving a sum and an outgoing carry.',380,true)
),
mapped AS (
  SELECT src.*, subtopic.id AS subtopic_id, book_section.id AS book_section_id
  FROM source src
  JOIN public.hodder_book_sections book_section
    ON book_section.chapter_number=src.chapter_number
   AND book_section.section_code=src.section_code
  JOIN public.syllabi syllabus
    ON syllabus.id=book_section.syllabus_id
   AND syllabus.code='0478'
   AND syllabus.version_label='2026-2028'
  JOIN public.topics topic
    ON topic.syllabus_id=syllabus.id AND topic.number=src.chapter_number
  JOIN LATERAL (
    SELECT st.id FROM public.subtopics st
    WHERE st.topic_id=topic.id AND (
      book_section.section_code=st.code
      OR book_section.section_code LIKE st.code || '.%'
      OR st.code=src.chapter_number::text
    )
    ORDER BY length(st.code) DESC LIMIT 1
  ) subtopic ON true
),
created AS (
  INSERT INTO public.glossary_terms
    (subtopic_id, term, definition_en, source_ref,
     status, is_official_key_term, definition_evidence_status)
  SELECT m.subtopic_id, m.term, m.definition_en,
    'Hodder 2021 ISBN 9781398318281; Chapter ' || m.chapter_number ||
    '; subsection ' || m.section_code ||
    '; printed p.' || m.printed_page ||
    '; PDF p.' || (m.printed_page + 12) ||
    '; book inline explanation' ||
    CASE WHEN m.is_extension
      THEN '; EXTENSION (not core 0478 syllabus)'
      ELSE '; core body concept' END,
    'approved', false,
    CASE WHEN m.is_extension
      THEN 'supplementary_source_screened'
      ELSE 'supplementary_targeted_verified' END
  FROM mapped m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.glossary_terms term
    JOIN public.subtopics st ON st.id=term.subtopic_id
    JOIN public.topics topic ON topic.id=st.topic_id
    WHERE topic.number=m.chapter_number
      AND topic.syllabus_id=(
        SELECT id FROM public.syllabi
         WHERE code='0478' AND version_label='2026-2028'
      )
      AND lower(trim(term.term))=lower(trim(m.term))
  )
  RETURNING id, term
)
INSERT INTO public.hodder_glossary_section_links
  (glossary_term_id, book_section_id)
SELECT created.id, mapped.book_section_id
FROM created JOIN mapped ON mapped.term=created.term
ON CONFLICT DO NOTHING;
