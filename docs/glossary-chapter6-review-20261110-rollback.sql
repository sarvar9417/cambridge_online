-- Exact rollback for Chapter 6 concept promotion.
WITH changes(id,term,new_definition,old_definition,new_source,old_source) AS (
 VALUES
('89d943cc-eaae-4ec9-baaa-b1088e6e29a8'::uuid,'Backup','A separate copy of data kept so the original can be restored if it is lost, damaged or corrupted.','A separate copy of data made so that the original can be recovered after loss or corruption.','Hodder 9618 (Watson & Williams, 2019), §6.1.4, p.167; Cambridge 9618 Syllabus 2027–2029, §5.1, p.23 (back-up software); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §6.1.4, p.167; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('3449c7e5-d034-4d67-a75b-ae8365aaef03'::uuid,'Data recovery','The process of restoring data after it has been lost, deleted or corrupted, often using a backup.','Restoring information that has been deleted, corrupted or made inaccessible.','Hodder 9618 (Watson & Williams, 2019), §6.1.4, p.167; Cambridge 9618 Syllabus 2027–2029, §5.1, p.23 (back-up software); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §6.1.4, p.167; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('15a352f8-666c-401b-b039-7dd4b935c2ec'::uuid,'Worm','A type of stand-alone malware that replicates itself and spreads to other computers, often across networks.','A standalone self-replicating malicious program that may spread across networks looking for weakly protected computers.','Hodder 9618 (Watson & Williams, 2019), §6.1.3, p.165; Cambridge 9618 Syllabus 2027–2029, §6.1, p.24 (malware threats); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §6.1.3, p.165; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('564c3e73-8b48-4729-992f-8d48c0026077'::uuid,'Validation versus verification','Validation checks that entered data is reasonable and meets defined rules; verification checks that data has been copied or transferred accurately, for example by visual check, double entry, parity or checksum.','Validation tests whether input is plausible; verification compares or checks it to reduce errors.','Hodder 9618 (Watson & Williams, 2019), §6.2.1–6.2.2, pp.169–170; Cambridge 9618 Syllabus 2027–2029, §6.2, p.24 (validation and verification methods); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §6.2.2, p.170; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-')
)
UPDATE public.glossary_terms AS g
SET definition_en=c.old_definition,
    source_ref=c.old_source,
    definition_evidence_status='supplementary_manual_review_required',
    is_glossary_visible=false
FROM changes AS c
WHERE g.id=c.id
  AND g.term=c.term
  AND g.definition_en=c.new_definition
  AND g.source_ref=c.new_source
  AND g.definition_evidence_status='supplementary_targeted_verified'
  AND g.is_glossary_visible=true
RETURNING g.id,g.term,g.definition_evidence_status,g.is_glossary_visible;
