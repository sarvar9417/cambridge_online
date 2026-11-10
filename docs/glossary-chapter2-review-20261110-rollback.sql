-- Rollback for Chapter 2 buffer-threshold term update.
WITH changes(id,new_term,old_term,new_definition,old_definition,new_source,old_source,new_evidence,old_evidence,new_visible,old_visible) AS (
 VALUES
('43751bb8-2c2c-43e9-a64e-0f753ffc9edf'::uuid,'Low water mark','Low-water mark','The minimum amount of data monitored in a playback buffer during streaming.','A lower data level monitored in a playback buffer to avoid running out during playback.','Hodder 9618 (Watson & Williams, 2019), §2.1.8, p.52; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-; source checked against the textbook''s explicit definition of low water mark as the minimum playback-buffer data level (10 Nov 2026).','Hodder 9618 (Watson & Williams, 2019), §2.1.8, p.52; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_targeted_verified','supplementary_manual_review_required',true,false),
('645f5d56-eb8c-462e-8917-22fc88237da8'::uuid,'High water mark','High-water mark','The maximum amount of data monitored in a playback buffer during streaming.','An upper data level monitored in a playback buffer as incoming data accumulates.','Hodder 9618 (Watson & Williams, 2019), §2.1.8, p.52; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-; source checked against the textbook''s explicit definition of high water mark as the maximum playback-buffer data level (10 Nov 2026).','Hodder 9618 (Watson & Williams, 2019), §2.1.8, p.52; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_targeted_verified','supplementary_source_screened',true,true)
)
UPDATE public.glossary_terms AS g
SET term=c.old_term,
    definition_en=c.old_definition,
    source_ref=c.old_source,
    definition_evidence_status=c.old_evidence,
    is_glossary_visible=c.old_visible
FROM changes AS c
WHERE g.id=c.id
  AND g.term=c.new_term
  AND g.definition_en=c.new_definition
  AND g.source_ref=c.new_source
  AND g.definition_evidence_status=c.new_evidence
  AND g.is_glossary_visible=c.new_visible
RETURNING g.id,g.term,g.definition_evidence_status,g.is_glossary_visible;
