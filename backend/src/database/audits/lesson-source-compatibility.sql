-- Lesson Studio source/corpus compatibility audit.
-- Apply pending migrations first. Queries 1-3 are zero-row invariants.

-- 1) Every current 9618 LO used by Chapters 1 and 13 must have at least one
-- explicit historical practice edge. Expected: 0 rows.
select
  lo.code as current_lo_code,
  st.code as subtopic_code,
  lo.text as current_lo_text
from public.learning_objectives lo
join public.subtopics st on st.id=lo.subtopic_id
join public.topics t on t.id=st.topic_id
join public.syllabi s on s.id=t.syllabus_id
where s.code='9618'
  and s.version_label='2026-2028'
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
-- edge (the 2023-2025 same-scope version counts). Expected: 0 rows.
select
  lo.code as current_lo_code,
  lo.text as current_lo_text
from public.learning_objectives lo
join public.subtopics st on st.id=lo.subtopic_id
join public.topics t on t.id=st.topic_id
join public.syllabi s on s.id=t.syllabus_id
where s.code='0478'
  and s.version_label='2026-2028'
  and st.code='7'
  and lo.code like '7-lo-%'
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

-- 3) Historical "comment on effectiveness" must not be treated as equivalent
-- to current algorithm-writing LO 7-lo-09. Expected: 0 rows.
select
  target_lo.code as target_lo_code,
  source_lo.code as source_lo_code,
  c.relation,
  c.evidence
from public.learning_objective_compatibility c
join public.learning_objectives target_lo on target_lo.id=c.target_lo_id
join public.subtopics target_st on target_st.id=target_lo.subtopic_id
join public.topics target_t on target_t.id=target_st.topic_id
join public.syllabi target_s on target_s.id=target_t.syllabus_id
join public.learning_objectives source_lo on source_lo.id=c.source_lo_id
join public.subtopics source_st on source_st.id=source_lo.subtopic_id
join public.topics source_t on source_t.id=source_st.topic_id
join public.syllabi source_s on source_s.id=source_t.syllabus_id
where target_s.code='0478'
  and target_s.version_label='2026-2028'
  and target_lo.code='7-lo-09'
  and source_s.code='0478'
  and source_s.version_label='2015-2022'
  and source_lo.code='2.1.1-lo-10'
  and c.relation in ('equivalent','subtopic_compatible');

-- 4) Recent QP source inventory must have a matching MS source paper for the
-- same qualification/year/series/component/variant. Expected: 0 rows for the
-- supplied 2025-2026 corpus used by these lessons.
select
  syllabus.code,
  qp.year,
  qp.series,
  component.number as component,
  qp.variant,
  qp.storage_path as qp_storage_path
from public.source_papers qp
join public.syllabi syllabus on syllabus.id=qp.syllabus_id
join public.components component on component.id=qp.component_id
where syllabus.code in ('9618','0478')
  and qp.year in (2025,2026)
  and qp.kind='QP'
  and not exists (
    select 1
    from public.source_papers ms
    where ms.syllabus_id=qp.syllabus_id
      and ms.component_id=qp.component_id
      and ms.year=qp.year
      and ms.series=qp.series
      and ms.variant=qp.variant
      and ms.kind='MS'
  )
order by syllabus.code,qp.year,qp.series,component.number,qp.variant;

-- 5) Informational only: mark-scheme trust distribution for approved questions
-- in the exact 9618 Chapter 1/13 historical corpus. Non-zero needs_review rows
-- are expected until their official source sections pass strict rubric audit.
select
  ms.status as mark_scheme_status,
  count(distinct ms.id) as mark_schemes
from public.questions q
join public.source_papers sp on sp.id=q.source_paper_id
join public.syllabi syllabus on syllabus.id=sp.syllabus_id
join public.question_learning_objectives qlo on qlo.question_id=q.id
join public.learning_objectives lo on lo.id=qlo.lo_id
join public.subtopics st on st.id=lo.subtopic_id
join public.mark_schemes ms on ms.question_id=q.id
where syllabus.code='9618'
  and sp.year between 2021 and 2025
  and q.status='approved'
  and q.marks is not null
  and st.code in ('1.1','1.2','1.3','13.1','13.2','13.3')
group by ms.status
order by ms.status;
