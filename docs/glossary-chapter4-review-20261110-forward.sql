-- Chapter 4 bit-manipulation terms: guarded promotion to Core.
WITH changes(id,term,old_definition,new_definition,old_source,new_source) AS (
 VALUES
('3c3654b8-a8f7-4bb2-9569-266341fa8a14'::uuid,'Bit manipulation','Changing or testing individual bits or groups of bits within a binary value.','Testing or changing selected bits in a binary value, usually with bitwise operations and masks.','Hodder 9618 (Watson & Williams, 2019), §4.3.2, p.131; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §4.3.2, p.131; Cambridge 9618 Syllabus 2027–2029, §4.3, p.22 (bit manipulation); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('a721e43a-fa8e-463d-a9a8-1dbd25d7ecdf'::uuid,'Bitwise AND','An operation producing a 1 in a bit position only when both input bits are 1.','Compares corresponding bits in two binary values; a result bit is 1 only when both input bits are 1.','Hodder 9618 (Watson & Williams, 2019), §4.3.2, p.131; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §4.3.2, p.131; Cambridge 9618 Syllabus 2027–2029, §4.3, p.22 (bitwise AND instruction); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('74e51e49-a861-4669-a058-6f8b3e76c9be'::uuid,'Bitwise OR','An operation producing a 1 in a bit position when at least one corresponding input bit is 1.','Compares corresponding bits in two binary values; a result bit is 1 when at least one input bit is 1.','Hodder 9618 (Watson & Williams, 2019), §4.3.2, p.131; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §4.3.2, p.131; Cambridge 9618 Syllabus 2027–2029, §4.3, p.22 (bitwise OR instruction); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('b33dabb0-b0ab-4e3b-9e91-ba96ba325357'::uuid,'Bitwise XOR','An operation producing a 1 in a bit position when its two input bits differ.','Compares corresponding bits in two binary values; a result bit is 1 when the input bits differ.','Hodder 9618 (Watson & Williams, 2019), §4.3.2, p.131; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §4.3.2, p.131; Cambridge 9618 Syllabus 2027–2029, §4.3, p.22 (bitwise XOR instruction); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-')
)
UPDATE public.glossary_terms AS g
SET definition_en=c.new_definition,
    source_ref=c.new_source,
    definition_evidence_status='supplementary_targeted_verified',
    is_glossary_visible=true
FROM changes AS c
WHERE g.id=c.id
  AND g.term=c.term
  AND g.definition_en=c.old_definition
  AND g.source_ref=c.old_source
  AND g.definition_evidence_status='supplementary_manual_review_required'
  AND g.is_glossary_visible=false
  AND g.status::text='approved'
  AND g.is_official_key_term=false
RETURNING g.id,g.term,g.definition_evidence_status,g.is_glossary_visible,g.is_official_key_term;
