-- Lesson Studio current-target/source compatibility audit.
-- Run after 0133_lesson_source_lo_compatibility_completion.sql.
-- Queries 1-3 are zero-row invariants; query 4 is informational coverage.

-- 1) Every current 9618 LO used by Chapters 1 and 13 must have at least one
-- explicit historical practice edge. Expected: 0 rows.
select lo.code as current_lo_code,st.code as subtopic_code,lo.text as current_lo_text
from public.learning_objectives lo
join public.subtopics st on st.id=lo.subtopic_id
join public.topics t on t.id=st.topic_id
join public.syllabi s on s.id=t.syllabus_id
where s.code='9618' and s.version_label='2026-2028'
  and st.code in ('1.1','1.2','1.3','13.1','13.2','13.3')
  and not exists (
    select 1
    from public.learning_objective_compatibility c
    join public.learning_objectives source_lo on source_lo.id=c.source_lo_id
    join public.subtopics source_st on source_st.id=source_lo.subtopic_id
    join public.topics source_t on source_t.id=source_st.topic_id
    join public.syllabi source_s on source_s.id=source_t.syllabus_id
    where c.target_lo_id=lo.id
      and c.relation in ('equivalent','subtopic_compatible')
      and source_s.code='9618'
      and source_s.version_label in ('2021-2023','2024-2025')
  )
order by st.code,lo.sort_order;

-- 2) Every current 0478 Topic 7 LO must have at least one explicit historical
-- edge. Expected: 0 rows.
select lo.code as current_lo_code,lo.text as current_lo_text
from public.learning_objectives lo
join public.subtopics st on st.id=lo.subtopic_id
join public.topics t on t.id=st.topic_id
join public.syllabi s on s.id=t.syllabus_id
where s.code='0478' and s.version_label='2026-2028'
  and st.code='7' and lo.code like '7-lo-%'
  and not exists (
    select 1
    from public.learning_objective_compatibility c
    join public.learning_objectives source_lo on source_lo.id=c.source_lo_id
    join public.subtopics source_st on source_st.id=source_lo.subtopic_id
    join public.topics source_t on source_t.id=source_st.topic_id
    join public.syllabi source_s on source_s.id=source_t.syllabus_id
    where c.target_lo_id=lo.id
      and c.relation in ('equivalent','subtopic_compatible')
      and source_s.code='0478'
      and source_s.version_label in ('2015-2022','2023-2025')
  )
order by lo.sort_order;

-- 3) Historical "comment on effectiveness" must not be treated as compatible
-- with current algorithm-writing LO 7-lo-09. Expected: 0 rows.
select target_lo.code as target_lo_code,source_lo.code as source_lo_code,c.relation,c.evidence
from public.learning_objective_compatibility c
join public.learning_objectives target_lo on target_lo.id=c.target_lo_id
join public.subtopics target_st on target_st.id=target_lo.subtopic_id
join public.topics target_t on target_t.id=target_st.topic_id
join public.syllabi target_s on target_s.id=target_t.syllabus_id
join public.learning_objectives source_lo on source_lo.id=c.source_lo_id
join public.subtopics source_st on source_st.id=source_lo.subtopic_id
join public.topics source_t on source_t.id=source_st.topic_id
join public.syllabi source_s on source_s.id=source_t.syllabus_id
where target_s.code='0478' and target_s.version_label='2026-2028'
  and target_lo.code='7-lo-09'
  and source_s.code='0478' and source_s.version_label='2015-2022'
  and source_lo.code='2.1.1-lo-10'
  and c.relation in ('equivalent','subtopic_compatible');

-- 4) Informational: approved source leaves available to each current target via
-- direct current LO or explicit compatibility, through 2026.
with targets as (
  select lo.id,lo.code,s.code syllabus_code
  from public.learning_objectives lo
  join public.subtopics st on st.id=lo.subtopic_id
  join public.topics t on t.id=st.topic_id
  join public.syllabi s on s.id=t.syllabus_id
  where s.version_label='2026-2028'
    and ((s.code='9618' and st.code in ('1.1','1.2','1.3','13.1','13.2','13.3'))
      or (s.code='0478' and st.code='7' and lo.code like '7-lo-%'))
), eligible as (
  select t.id target_id,t.code target_code,t.syllabus_code,t.id source_id from targets t
  union all
  select t.id,t.code,t.syllabus_code,c.source_lo_id
  from targets t join public.learning_objective_compatibility c on c.target_lo_id=t.id
  where c.relation in ('equivalent','subtopic_compatible')
)
select e.syllabus_code,e.target_code,count(distinct q.id) approved_questions,
       min(sp.year) first_year,max(sp.year) last_year
from eligible e
join public.question_learning_objectives qlo on qlo.lo_id=e.source_id
join public.questions q on q.id=qlo.question_id and q.status='approved' and q.marks is not null
join public.source_papers sp on sp.id=q.source_paper_id and sp.year<=2026
join public.syllabi qs on qs.id=sp.syllabus_id and qs.code=e.syllabus_code
group by e.syllabus_code,e.target_code
order by e.syllabus_code,e.target_code;
