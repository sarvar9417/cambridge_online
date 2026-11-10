-- Chapter 2 buffer-threshold terms: guarded, reversible update.
WITH changes(id,old_term,new_term,old_definition,new_definition,old_source,new_source,old_evidence,new_evidence,old_visible,new_visible) AS (
 VALUES
('43751bb8-2c2c-43e9-a64e-0f753ffc9edf'::uuid,'Low-water mark','Low water mark','A lower data level monitored in a playback buffer to avoid running out during playback.','The minimum amount of data monitored in a playback buffer during streaming.','Hodder 9618 (Watson & Williams, 2019), §2.1.8, p.52; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §2.1.8, p.52; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-; source checked against the textbook''s explicit definition of low water mark as the minimum playback-buffer data level (10 Nov 2026).','supplementary_manual_review_required','supplementary_targeted_verified',false,true),
('645f5d56-eb8c-462e-8917-22fc88237da8'::uuid,'High-water mark','High water mark','An upper data level monitored in a playback buffer as incoming data accumulates.','The maximum amount of data monitored in a playback buffer during streaming.','Hodder 9618 (Watson & Williams, 2019), §2.1.8, p.52; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §2.1.8, p.52; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-; source checked against the textbook''s explicit definition of high water mark as the maximum playback-buffer data level (10 Nov 2026).','supplementary_source_screened','supplementary_targeted_verified',true,true)
)
UPDATE public.glossary_terms AS g
SET term=c.new_term,
    definition_en=c.new_definition,
    source_ref=c.new_source,
    definition_evidence_status=c.new_evidence,
    is_glossary_visible=c.new_visible
FROM changes AS c
WHERE g.id=c.id
  AND g.term=c.old_term
  AND g.definition_en=c.old_definition
  AND g.source_ref=c.old_source
  AND g.definition_evidence_status=c.old_evidence
  AND g.is_glossary_visible=c.old_visible
  AND g.status::text='approved'
  AND g.is_official_key_term=false
RETURNING g.id,g.term,g.definition_evidence_status,g.is_glossary_visible,g.is_official_key_term;
