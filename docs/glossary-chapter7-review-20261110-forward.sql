-- Chapter 7: source-verified ethics, licensing and AI concepts.
WITH changes(id,term,old_definition,new_definition,old_source,new_source) AS (
 VALUES
('8173ee00-3bc1-4dc6-9ac9-e59a0bab0fcc'::uuid,'Legal versus ethical behaviour','An action''s legality and whether it meets a professional ethical standard are distinct questions.','Legal behaviour follows the law; ethical behaviour follows accepted moral and professional principles. An action may be legal but still unethical.','Hodder 9618 (2019), §7.1.1, p.180; PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (2019), §7.1.1, pp.179–180; Cambridge 9618 Syllabus 2027–2029, §7.1, p.25 (acting ethically); PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('a0e5c20b-db2d-4ac2-a819-4ae7883992c2'::uuid,'Conflict of interest','A situation where personal or other interests could compromise impartial professional judgement.','A situation in which personal interests could influence professional judgement or conflict with duties to an employer, client or the public.','Hodder 9618 (2019), §7.1.2, p.181; PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (2019), §7.1.2, p.181 (IEEE Code of Ethics); Cambridge 9618 Syllabus 2027–2029, §7.1, p.25 (professional ethics); PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('b3c8f18f-97b9-4b86-8b37-1c55d86b4adc'::uuid,'Software licence','A set of legal permissions and conditions specifying how a software product can be used and shared.','A legal agreement setting the conditions under which software may be installed, used, copied, modified or shared.','Hodder 9618 (2019), §7.2.3, p.187; PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (2019), §7.2.1–7.2.3, pp.186–189; Cambridge 9618 Syllabus 2027–2029, §7.1, p.25 (software licensing types); PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('c7a4c536-558e-4f72-91bb-52fe8c4b2815'::uuid,'AI decision-making','Selecting a response or action based on information, as in tasks people would otherwise decide.','The ability of an AI system to choose an action or response after processing information, similar to a decision a person might make.','Hodder 9618 (2019), §7.3.1, p.190; PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (2019), §7.3.1, p.190; Cambridge 9618 Syllabus 2027–2029, §7.1, p.25 (applications of AI); PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('470f4477-dedd-4d24-b17e-733122ac0efc'::uuid,'Social impacts of AI','Effects of AI on individuals, employment, privacy and the wider community.','Effects of AI on people and society, including changes to work, employment, privacy and daily life.','Hodder 9618 (2019), §7.3.3, p.190; PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (2019), §7.3.2–7.3.3, pp.190–193; Cambridge 9618 Syllabus 2027–2029, §7.1, p.25 (social impact of AI); PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-'),
('d69a23b2-9bdc-4348-adba-e1be34a06189'::uuid,'Economic impacts of AI','Consequences of AI automation for productivity, employment and distribution of income.','Effects of AI on economic activity, including productivity, employment, job creation, job losses and income distribution.','Hodder 9618 (2019), §7.3.3, p.190; PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-','Hodder 9618 (2019), §7.3.2–7.3.3, pp.190–192; Cambridge 9618 Syllabus 2027–2029, §7.1, p.25 (economic impact of AI); PDF:9618_Chapter_7.pdf; Drive:17qXAmcDsvLV96ytM5w75MWYNsGw9Buf-')
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
