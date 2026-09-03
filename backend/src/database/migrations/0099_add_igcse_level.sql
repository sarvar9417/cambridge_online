-- 0099_add_igcse_level.sql
-- Cambridge IGCSE Computer Science 0478 uses the same syllabus/topic/component
-- tables as 9618, but must not be mislabeled as AS or A2.

ALTER TYPE level_type ADD VALUE IF NOT EXISTS 'IGCSE';
