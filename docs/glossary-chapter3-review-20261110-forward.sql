-- Chapter 3 source-verified concept promotion; exact old-state guard.
WITH changes(id,old_term,new_term,old_definition,new_definition,old_source,new_source,old_evidence,new_evidence,old_visible,new_visible) AS (
 VALUES
('be1e413b-8c64-4e60-bf2e-9c8f3f96a099'::uuid,'Boolean expression','Logic expression','An algebraic representation of a condition expressed with logic variables and operators.','A combination of logic variables and operators, such as AND, OR and NOT, that represents a condition and evaluates to TRUE (1) or FALSE (0).','Hodder 9618 (Watson & Williams, 2019), §3.2.4, p.92; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), Chapter 3 learning outcomes, p.68 and §3.2.4, p.92; source wording is ''logic expression''; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_manual_review_required','supplementary_targeted_verified',false,true),
('e8bc1776-3d62-46ed-b43a-89f6fb3aecd8'::uuid,'Magnetic storage','Magnetic storage','Storage that records binary information using magnetised areas of a medium.','A method of storing data by magnetising areas of a recording medium; a read/write head detects or changes the magnetic pattern.','Hodder 9618 (Watson & Williams, 2019), §3.1.1, p.73; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §3.1.1, p.73; Cambridge 9618 Syllabus 2027–2029, §3.1.2, p.17 (magnetic hard disk); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_manual_review_required','supplementary_targeted_verified',false,true),
('8bf96318-7aa4-4587-a82c-0d8630ea04bc'::uuid,'Real-time response (embedded system)','Real-time response (embedded system)','A quick response to a changing input, listed as a benefit of embedded systems.','The ability of an embedded system to react to changing inputs quickly enough for the required task.','Hodder 9618 (Watson & Williams, 2019), §3.1.1, p.72; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §3.1.1, p.72; Cambridge 9618 Syllabus 2027–2029, §3.1.1, p.17 (embedded-system benefits and drawbacks); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_manual_review_required','supplementary_targeted_verified',false,true),
('d51e7b7f-198e-45e8-8542-5111c32c8af4'::uuid,'Sensor-based monitoring versus control','Monitoring and control systems','Monitoring reports observed values; control changes devices to bring conditions toward set values.','A monitoring system uses sensors to measure and report conditions; a control system uses sensor readings, feedback and actuators to adjust the process.','Hodder 9618 (Watson & Williams, 2019), §3.1.2, p.86; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §3.1.2, p.86; Cambridge 9618 Syllabus 2027–2029, §3.1.2, p.17 (monitoring, control, sensors, actuators and feedback); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_manual_review_required','supplementary_targeted_verified',false,true),
('bfb19871-7b97-42e3-801d-ad3425ee8898'::uuid,'Infrared or motion sensor','Infrared/motion sensor','A detector used to identify motion or changes in infrared energy around it.','A sensor that detects movement or changes in infrared radiation and can trigger an action, such as an alarm or automatic door.','Hodder 9618 (Watson & Williams, 2019), §3.1.2, p.85; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §3.1.2, p.85; Cambridge 9618 Syllabus 2027–2029, §3.1.2, p.17 (infrared sensors); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_manual_review_required','supplementary_targeted_verified',false,true)
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
