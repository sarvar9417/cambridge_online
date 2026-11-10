-- Exact rollback for Chapter 8 database/SQL concept promotion.
WITH changes(id,new_term,old_term,new_definition,old_definition,new_source,old_source) AS (
 VALUES
('cecbaf28-2718-4a58-b346-9f8e7bf4a317'::uuid,'Database approach','Database approach','A way of storing shared data in a database so multiple applications use the same records and validation rules instead of keeping separate copies.','Using shared tables, database design and rules to support several application programs.','Hodder 9618 (Watson & Williams, 2019), §8.1.2, p.199; Cambridge 9618 Syllabus 2027–2029, §8.1, p.25 (file-based limitations and relational database features); PDF:9618_Chapter_8.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §8.1.2, p.199; chapter detail; PDF:9618_Chapter_8.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('81899bf7-025a-42ed-9eb6-7f3dc160b926'::uuid,'One-to-one relationship','One and only one cardinality','A relationship in which each record in one table is linked to exactly one record in the other table.','A requirement that exactly one corresponding entity occur.','Hodder 9618 (Watson & Williams, 2019), §8.1.4, p.202 (cardinality); Cambridge 9618 Syllabus 2027–2029, §8.1, p.25 (one-to-one relationships); PDF:9618_Chapter_8.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §8.1.4, p.202; chapter detail; PDF:9618_Chapter_8.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('99958369-bc41-48b1-b13b-a216204faf03'::uuid,'SQL data type','SQL data type','A declaration that specifies what kind of value a database column can store, such as an integer, real number, date or time.','A declaration defining the kind of value held in a table column.','Hodder 9618 (Watson & Williams, 2019), §8.3.2, p.212; Cambridge 9618 Syllabus 2027–2029, §8.3, p.26 (SQL column data types); PDF:9618_Chapter_8.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §8.3.2, p.212; chapter detail; PDF:9618_Chapter_8.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('9f524139-64bb-4beb-b0d0-c32c6f912bb4'::uuid,'TIME','TIME','A SQL data type used to store a time value, usually in hours, minutes and seconds.','A type used for times, usually shown in HH:MM:SS form.','Hodder 9618 (Watson & Williams, 2019), §8.3.2, p.212; Cambridge 9618 Syllabus 2027–2029, §8.3, p.26 (TIME data type); PDF:9618_Chapter_8.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §8.3.2, p.212; chapter detail; PDF:9618_Chapter_8.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-')
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
