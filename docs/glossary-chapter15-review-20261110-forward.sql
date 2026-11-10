-- Chapter 15: promote Boolean algebra concepts explicitly required by the syllabus.
WITH changes(id,term,old_definition,new_definition,old_source,new_source) AS (
 VALUES
('c0cfe732-f066-4427-b593-5912452f02ca'::uuid,'AND operator','An operation true only when both operands are true, written using a dot in this book.','A Boolean operator that produces 1 only when both input values are 1; the coursebook writes it using a dot (·).','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (Boolean algebra); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('bd478b90-1f35-43d3-a5cc-54fa13ccba42'::uuid,'OR operator','An operation true when at least one operand is true, written using a plus sign in this book.','A Boolean operator that produces 1 when at least one input value is 1; the coursebook writes it using a plus sign (+).','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (Boolean algebra); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('c485af27-cbf6-49aa-9d2c-6fb3e04b0987'::uuid,'Boolean expression','An expression combining Boolean variables and operators to describe circuit output.','An expression formed from Boolean variables and operators that determines the output of a logic circuit.','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.354; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, pp.354–355; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (Boolean algebra and logic circuits); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('92527697-5916-4eb5-8362-c856e909d2c5'::uuid,'Boolean variable','A symbol that can take either of the two Boolean values, zero or one.','A variable that can have one of two Boolean values: 0 or 1.','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.354; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.354; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (Boolean algebra); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('e8e7b678-3a71-4825-a02c-ac628786a7c5'::uuid,'Boolean simplification','Replacing a logical expression with a shorter equivalent expression using Boolean laws.','The process of using Boolean algebra laws to replace an expression with a simpler equivalent expression that produces the same output.','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, pp.355–356; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (simplify logic circuits/expressions using Boolean algebra); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-')
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
