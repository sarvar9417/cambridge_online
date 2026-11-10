-- Exact rollback for Chapter 5 operating-system concept promotion.
WITH changes(id,new_term,old_term,new_definition,old_definition,new_source,old_source) AS (
 VALUES
('edda5fbf-d8a0-4f93-88a9-9c47921951ec'::uuid,'Disk contents analysis/repair software','Disk contents repair','Utility software that checks a disk''s contents for problems and attempts to repair them.','Utility actions that mark unusable areas and help keep remaining disk storage accessible.','Hodder 9618 (Watson & Williams, 2019), §5.1.3, p.143; Cambridge 9618 Syllabus 2027–2029, §5.1, p.23 (disk contents analysis/disk repair software); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §5.1.3, p.145; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('159f98d8-49ad-43c4-ae7c-ae266edf21ca'::uuid,'Memory swapping','Memory swapping','The operating system''s process of moving data between RAM and secondary storage to free main memory for other processes.','Moving data between main memory and a disk or solid-state drive.','Hodder 9618 (Watson & Williams, 2019), §5.1.2, p.140; Cambridge 9618 Syllabus 2027–2029, §5.1, p.23 (memory management); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §5.1.2, p.140; chapter detail; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-')
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
