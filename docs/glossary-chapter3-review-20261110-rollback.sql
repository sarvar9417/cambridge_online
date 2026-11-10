-- Exact rollback for Chapter 3 source-verified concept promotion.
WITH changes(id,new_term,old_term,new_definition,old_definition,new_source,old_source,new_evidence,old_evidence,new_visible,old_visible) AS (
 VALUES
('be1e413b-8c64-4e60-bf2e-9c8f3f96a099'::uuid,'Logic expression','Boolean expression','A combination of logic variables and operators, such as AND, OR and NOT, that represents a condition and evaluates to TRUE (1) or FALSE (0).','An algebraic representation of a condition expressed with logic variables and operators.','Hodder 9618 (Watson & Williams, 2019), Chapter 3 learning outcomes, p.68 and §3.2.4, p.92; source wording is ''logic expression''; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §3.2.4, p.92; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_targeted_verified','supplementary_manual_review_required',true,false),
('e8bc1776-3d62-46ed-b43a-89f6fb3aecd8'::uuid,'Magnetic storage','Magnetic storage','A method of storing data by magnetising areas of a recording medium; a read/write head detects or changes the magnetic pattern.','Storage that records binary information using magnetised areas of a medium.','Hodder 9618 (Watson & Williams, 2019), §3.1.1, p.73; Cambridge 9618 Syllabus 2027–2029, §3.1.2, p.17 (magnetic hard disk); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §3.1.1, p.73; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_targeted_verified','supplementary_manual_review_required',true,false),
('8bf96318-7aa4-4587-a82c-0d8630ea04bc'::uuid,'Real-time response (embedded system)','Real-time response (embedded system)','The ability of an embedded system to react to changing inputs quickly enough for the required task.','A quick response to a changing input, listed as a benefit of embedded systems.','Hodder 9618 (Watson & Williams, 2019), §3.1.1, p.72; Cambridge 9618 Syllabus 2027–2029, §3.1.1, p.17 (embedded-system benefits and drawbacks); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §3.1.1, p.72; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_targeted_verified','supplementary_manual_review_required',true,false),
('d51e7b7f-198e-45e8-8542-5111c32c8af4'::uuid,'Monitoring and control systems','Sensor-based monitoring versus control','A monitoring system uses sensors to measure and report conditions; a control system uses sensor readings, feedback and actuators to adjust the process.','Monitoring reports observed values; control changes devices to bring conditions toward set values.','Hodder 9618 (Watson & Williams, 2019), §3.1.2, p.86; Cambridge 9618 Syllabus 2027–2029, §3.1.2, p.17 (monitoring, control, sensors, actuators and feedback); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §3.1.2, p.86; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_targeted_verified','supplementary_manual_review_required',true,false),
('bfb19871-7b97-42e3-801d-ad3425ee8898'::uuid,'Infrared/motion sensor','Infrared or motion sensor','A sensor that detects movement or changes in infrared radiation and can trigger an action, such as an alarm or automatic door.','A detector used to identify motion or changes in infrared energy around it.','Hodder 9618 (Watson & Williams, 2019), §3.1.2, p.85; Cambridge 9618 Syllabus 2027–2029, §3.1.2, p.17 (infrared sensors); Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (Watson & Williams, 2019), §3.1.2, p.85; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','supplementary_targeted_verified','supplementary_manual_review_required',true,false)
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
