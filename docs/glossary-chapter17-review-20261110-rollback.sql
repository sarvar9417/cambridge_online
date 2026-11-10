-- Exact rollback for Chapter 17 promotion and term renames.
WITH changes(id,new_term,old_term,new_definition,old_definition,new_source,old_source) AS (
 VALUES
('96ab5d37-8791-4bf1-9167-fded5d8168c6'::uuid,'Public-key authenticity problem','Public-key authenticity problem','A public key alone does not prove who owns it; the recipient needs a trusted way to verify that the key belongs to the claimed sender.','The recipient still needs a way to confirm that a claimed sender or key is genuine.','Hodder 9618 (Watson & Williams, 2019), §17.1.3, p.414 and §17.4.2, p.421; Cambridge 9618 Syllabus 2027–2029, §17.1, p.36 (digital certification); PDF:9618_Chapter_17.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §17.1.3, p.414; chapter detail; PDF:9618_Chapter_17.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('729c1237-9cf9-44a3-b3d3-00a770a16daf'::uuid,'Digital certificate acquisition','Certificate issuance','The applicant sends identifying information and a public key to a certificate authority; the authority verifies the identity and issues a certificate linking them.','The authority creating a certificate for an approved applicant and sending it back.','Hodder 9618 (Watson & Williams, 2019), §17.4.2, p.421; Cambridge 9618 Syllabus 2027–2029, §17.1, p.36 (how a digital certificate is acquired); PDF:9618_Chapter_17.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §17.4.2, p.421; chapter detail; PDF:9618_Chapter_17.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('ceabaeda-eca9-4e78-b914-22bb50596adf'::uuid,'Session key','Temporary session key','A short-lived symmetric key shared by a client and server to encrypt data during one secure session.','The short-lived symmetric key used by both sides for encrypting a secure browsing session in the book''s example.','Hodder 9618 (Watson & Williams, 2019), §17.3.2, p.418; Cambridge 9618 Syllabus 2027–2029, §17.1, p.36 (SSL/TLS encryption protocols); PDF:9618_Chapter_17.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §17.3.2, p.418; chapter detail; PDF:9618_Chapter_17.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('4bd5e609-a48c-408b-8957-0041f454523e'::uuid,'Quantum cryptography limitations','QKD distance limitation','The coursebook identifies the need for specialist optical hardware and dedicated links, limited transmission range, and possible changes to photon polarisation in fibre as limitations of quantum key distribution.','The book''s 2019 claim that available systems had a limited usable transmission range.','Hodder 9618 (Watson & Williams, 2019), §17.2, p.415; Cambridge 9618 Syllabus 2027–2029, §17.1, p.36 (purpose, benefits and drawbacks of quantum cryptography); PDF:9618_Chapter_17.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §17.2, p.415; chapter detail; PDF:9618_Chapter_17.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-')
)
UPDATE public.glossary_terms AS g
SET term=c.old_term,
    definition_en=c.old_definition,
    source_ref=c.old_source,
    definition_evidence_status='supplementary_manual_review_required',
    is_glossary_visible=false
FROM changes AS c
WHERE g.id=c.id
  AND g.term=c.new_term
  AND g.definition_en=c.new_definition
  AND g.source_ref=c.new_source
  AND g.definition_evidence_status='supplementary_targeted_verified'
  AND g.is_glossary_visible=true
RETURNING g.id,g.term,g.definition_evidence_status,g.is_glossary_visible;
