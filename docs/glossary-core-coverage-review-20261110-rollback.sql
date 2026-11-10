-- Rollback for glossary-core-coverage-review-20261110-forward.sql
-- Restores the exact previous term, definition, source_ref, evidence status and visibility.
WITH previous(id, term, definition_en, source_ref, definition_evidence_status, is_glossary_visible) AS (
  VALUES
('6256c37b-ccf9-4534-92f7-bc841b7ef740'::uuid, 'BOOLEAN', 'A logical data type representing true or false.', 'Hodder 9618 (2019), §10.1.1, p.240; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('941cdea4-00e1-4562-9906-e9827295b674'::uuid, 'CHAR', 'A data type containing one alphanumeric character.', 'Hodder 9618 (2019), §10.1.1, p.240; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('104c1ec8-b4f2-48c6-a50d-5b45bc16240d'::uuid, 'DATE', 'A data type representing a calendar date.', 'Hodder 9618 (2019), §10.1.1, p.240; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('6b542e43-c8f7-41a7-b453-8b38a0767d1a'::uuid, 'INTEGER', 'A data type for whole numbers, including positive, negative and zero values.', 'Hodder 9618 (2019), §10.1.1, p.240; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('f2052294-0136-497f-bff1-8542ae5ed5cd'::uuid, 'REAL', 'A data type for numbers with fractional components.', 'Hodder 9618 (2019), §10.1.1, p.240; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_manual_review_required', false),
('ce24e284-6b9c-4b25-8f79-6fe8f7f05f32'::uuid, 'STRING', 'A sequence of characters including letters, digits or other symbols.', 'Hodder 9618 (2019), §10.1.1, p.240; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('0c581b6f-2c35-4fa1-b483-48729fe82985'::uuid, 'EOF(file)', 'A Boolean function indicating whether the end of a file has been reached.', 'Hodder 9618 (2019), §10.3, p.249; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('fc45e99e-835a-4aeb-b481-e59fe4f5c05f'::uuid, 'File mode', 'A setting determining how an opened file may be read from or written to.', 'Hodder 9618 (2019), §10.3, p.249; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('71a67e1e-8759-4dba-8607-ad1c0b0a2bd2'::uuid, 'Text file', 'A file storing a sequence of characters that may include end-of-line markers.', 'Hodder 9618 (2019), §10.3, p.249; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('90c47865-69c1-4cea-a080-f018c98de11a'::uuid, 'CASE selection', 'A selection construct choosing a branch according to the value or range of an identifier.', 'Hodder 9618 (Watson & Williams, 2019), §11.2.1, p.272; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_manual_review_required', false),
('d50acf16-d1e5-41f3-b7d7-e25d3dea2396'::uuid, 'Count-controlled loop', 'A loop repeating a known number of times with a counter.', 'Hodder 9618 (Watson & Williams, 2019), §11.2.2, p.274; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('97295397-cd70-4c60-8b5d-3d2d692cd268'::uuid, 'IF selection', 'A selection construct executing a statement or block only when a condition is true.', 'Hodder 9618 (Watson & Williams, 2019), §11.2.1, p.272; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_manual_review_required', false),
('e5eedbef-8caf-4b2c-bb97-c06a98a573a1'::uuid, 'Nested IF', 'An IF statement placed inside another IF or ELSE branch, allowing the program to make an additional decision only when that branch is reached.', 'Hodder 9618 (Watson & Williams, 2019), §11.2.1, p.272; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('b0da2819-b53c-4ba1-a317-c69ed7b0f8b3'::uuid, 'Post-condition loop', 'A repetition structure checking its stopping condition after the body executes.', 'Hodder 9618 (Watson & Williams, 2019), §11.2.2, p.274; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true),
('d0272651-b95a-40be-8485-4d84ae952726'::uuid, 'Pre-condition loop', 'A repetition structure checking its condition before running the body.', 'Hodder 9618 (Watson & Williams, 2019), §11.2.2, p.274; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-', 'supplementary_source_screened', true)
)
UPDATE public.glossary_terms AS g
SET term = p.term,
    definition_en = p.definition_en,
    source_ref = p.source_ref,
    definition_evidence_status = p.definition_evidence_status,
    is_glossary_visible = p.is_glossary_visible
FROM previous AS p
WHERE g.id = p.id
RETURNING g.id, g.term, g.definition_evidence_status, g.is_glossary_visible;
