-- Exact rollback for Chapter 15 Boolean algebra promotion.
WITH changes(id,term,new_definition,old_definition,new_source,old_source) AS (
 VALUES
('c0cfe732-f066-4427-b593-5912452f02ca'::uuid,'AND operator','A Boolean operator that produces 1 only when both input values are 1; the coursebook writes it using a dot (·).','An operation true only when both operands are true, written using a dot in this book.','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (Boolean algebra); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('bd478b90-1f35-43d3-a5cc-54fa13ccba42'::uuid,'OR operator','A Boolean operator that produces 1 when at least one input value is 1; the coursebook writes it using a plus sign (+).','An operation true when at least one operand is true, written using a plus sign in this book.','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (Boolean algebra); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('c485af27-cbf6-49aa-9d2c-6fb3e04b0987'::uuid,'Boolean expression','An expression formed from Boolean variables and operators that determines the output of a logic circuit.','An expression combining Boolean variables and operators to describe circuit output.','Hodder 9618 (Watson & Williams, 2019), §15.2.1, pp.354–355; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (Boolean algebra and logic circuits); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.354; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('92527697-5916-4eb5-8362-c856e909d2c5'::uuid,'Boolean variable','A variable that can have one of two Boolean values: 0 or 1.','A symbol that can take either of the two Boolean values, zero or one.','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.354; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (Boolean algebra); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.354; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('e8e7b678-3a71-4825-a02c-ac628786a7c5'::uuid,'Boolean simplification','The process of using Boolean algebra laws to replace an expression with a simpler equivalent expression that produces the same output.','Replacing a logical expression with a shorter equivalent expression using Boolean laws.','Hodder 9618 (Watson & Williams, 2019), §15.2.1, pp.355–356; Cambridge 9618 Syllabus 2027–2029, §15.2, p.34 (simplify logic circuits/expressions using Boolean algebra); PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §15.2.1, p.355; chapter detail; PDF:9618_Chapter_15.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-')
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
