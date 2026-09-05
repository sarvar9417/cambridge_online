-- Read-only 9618 practice-pool coverage report.
--
-- Direct eligibility reproduces the current AssignmentsService.createPractice() rules.
-- Compatible eligibility additionally allows a historical question when at least one
-- assessed historical LO has a reviewed compatible target LO in the target subtopic.
-- Persisted question taxonomy is never rewritten by this audit.

with target_subtopics as (
  select s.id syllabus_id,
         s.version_label,
         st.id subtopic_id,
         st.code,
         st.title
  from syllabi s
  join topics t on t.syllabus_id = s.id
  join subtopics st on st.topic_id = t.id
  where s.code = '9618'
), direct_eligible as (
  select distinct qs.subtopic_id, q.id question_id
  from question_subtopics qs
  join questions q on q.id = qs.question_id
  join mark_schemes ms on ms.question_id = q.id and ms.status = 'approved'
  where q.status = 'approved'
    and q.parent_id is not null
    and q.marks is not null
    and q.answer_kind not in ('diagram', 'image')
), compatible_eligible as (
  select distinct ts.subtopic_id, q.id question_id
  from target_subtopics ts
  join learning_objectives target_lo on target_lo.subtopic_id = ts.subtopic_id
  join syllabus_lo_compatibility compat
    on compat.target_lo_id = target_lo.id
   and compat.compatibility_kind in ('equivalent', 'narrower_source')
   and compat.reviewed_at is not null
  join question_learning_objectives qlo on qlo.lo_id = compat.source_lo_id
  join questions q on q.id = qlo.question_id
  join mark_schemes ms on ms.question_id = q.id and ms.status = 'approved'
  where q.status = 'approved'
    and q.parent_id is not null
    and q.marks is not null
    and q.answer_kind not in ('diagram', 'image')
), pools as (
  select ts.version_label,
         ts.code,
         ts.title,
         count(distinct de.question_id)::integer direct_questions,
         count(distinct ce.question_id)::integer compatible_questions,
         count(distinct coalesce(de.question_id, ce.question_id))::integer total_questions
  from target_subtopics ts
  left join direct_eligible de on de.subtopic_id = ts.subtopic_id
  left join compatible_eligible ce on ce.subtopic_id = ts.subtopic_id
  group by ts.version_label, ts.code, ts.title
)
select version_label,
       code,
       title,
       direct_questions,
       compatible_questions,
       total_questions,
       case
         when total_questions >= 5 then 'ready'
         when total_questions > 0 then 'thin'
         else 'empty'
       end as practice_status
from pools
order by version_label, string_to_array(code, '.')::integer[];
