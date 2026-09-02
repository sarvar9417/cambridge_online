-- Restore source-backed Cambridge 9618 dependency metadata for the 2021-2025 corpus.
--
-- This migration is intentionally idempotent. It covers three high-confidence classes:
--   1. explicit answer-to/from-part references;
--   2. Paper 4 test/screenshot evidence tasks that consume the immediately preceding code task;
--   3. manually verified sibling text/answer references, expanded only to exact duplicate stems
--      in the same component and only when the same target path exists in that source paper.
--
-- Dependency semantics:
--   answer_ref + required => candidate must produce the earlier answer/code.
--   text_ref   + required => printed sibling material must travel with the selected leaf.

-- 1) Explicit candidate-answer dependencies.
with mappings(from_ref,target_path,evidence) as (values
  ('9618/31/O/N/21 Q7(b)(iii)','7.b.ii','Explicit wording: answer to part b(ii)'),
  ('9618/31/O/N/21 Q7(b)(iv)','7.b.iii','Explicit wording: answer to part b(iii)'),
  ('9618/32/O/N/21 Q7(b)(iii)','7.b.ii','Explicit wording: answer to part b(ii)'),
  ('9618/32/O/N/21 Q7(b)(iv)','7.b.iii','Explicit wording: answer to part b(iii)'),
  ('9618/12/M/J/22 Q1(b)(ii)','1.b.i','Explicit wording: use your answer from part (b)(i)'),
  ('9618/22/O/N/22 Q2(a)(iii)','2.a.i','Explicit wording: answer to part 2(a)(i)'),
  ('9618/31/O/N/22 Q7(c)','7.b','Explicit wording: answer to part (b)'),
  ('9618/33/O/N/22 Q7(c)','7.b','Explicit wording: answer to part (b)'),
  ('9618/22/M/J/23 Q1(a)(ii)','1.a.i','Explicit wording: answer to part (a)(i)'),
  ('9618/31/M/J/23 Q7(c)','7.b','Explicit wording: answer to part (b)'),
  ('9618/31/M/J/23 Q7(d)','7.c','Explicit wording: answer to part (c)'),
  ('9618/32/M/J/23 Q9(d)','9.c','Explicit wording: answer to part (c)'),
  ('9618/32/M/J/23 Q9(e)','9.d','Explicit wording: answer to part (d)'),
  ('9618/33/M/J/23 Q7(c)','7.b','Explicit wording: answer to part (b)'),
  ('9618/33/M/J/23 Q7(d)','7.c','Explicit wording: answer to part (c)'),
  ('9618/31/M/J/24 Q6(c)(iii)','6.c.ii','Explicit wording: answer to part (c)(ii)'),
  ('9618/32/M/J/24 Q6(c)(iii)','6.c.ii','Explicit wording: answer to part c(ii)'),
  ('9618/33/M/J/24 Q6(c)(iii)','6.c.ii','Explicit wording: answer to part (c)(ii)'),
  ('9618/21/O/N/24 Q1(b)(ii)','1.b.i','Explicit wording: answer to part (b)(i)'),
  ('9618/31/O/N/24 Q11(b)','11.a','Explicit wording: using your answer for part (a)'),
  ('9618/31/O/N/24 Q7(d)(i)','7.c','Explicit wording: answer to part (c)'),
  ('9618/31/O/N/24 Q7(d)(ii)','7.d.i','Explicit wording: answer to part (d)(i)'),
  ('9618/32/O/N/24 Q11(b)','11.a','Explicit wording: using your answer for part (a)'),
  ('9618/32/O/N/24 Q6(d)','6.c','Explicit wording: answer to part (c)'),
  ('9618/33/O/N/24 Q11(b)','11.a','Explicit wording: using your answer for part (a)'),
  ('9618/33/O/N/24 Q7(d)(i)','7.c','Explicit wording: answer to part (c)'),
  ('9618/33/O/N/24 Q7(d)(ii)','7.d.i','Explicit wording: answer to part (d)(i)')
), resolved as (
  select f.id question_id,t.id depends_on_id,m.evidence
  from mappings m
  join questions f on f.display_ref=m.from_ref and f.marks>0
  join questions t on t.source_paper_id=f.source_paper_id and t.path=m.target_path and t.marks>0
)
insert into question_dependencies(question_id,depends_on_id,kind,strength,evidence,detected_by,confidence)
select question_id,depends_on_id,'answer_ref','required',evidence,'migration-0085',1.0
from resolved
on conflict(question_id,depends_on_id) do update set
  kind=excluded.kind,
  strength=excluded.strength,
  evidence=excluded.evidence,
  detected_by=excluded.detected_by,
  confidence=excluded.confidence;

-- 2) Paper 4 practical test/evidence tasks consume the immediately preceding sibling code task.
with q4 as (
  select q.*
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  join components c on c.id=q.component_id
  join syllabi s on s.id=sp.syllabus_id
  where s.code='9618'
    and sp.kind='QP'::paper_kind
    and sp.source_url is not null
    and sp.year between 2021 and 2025
    and c.number=4
    and q.marks>0
), tests as (
  select *
  from q4
  where stem_md ~* 'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
), mapped as (
  select t.id question_id,p.id depends_on_id,p.display_ref target_ref,
         row_number() over(partition by t.id order by p.sort_order desc) rn
  from tests t
  join q4 p
    on p.source_paper_id=t.source_paper_id
   and p.parent_id is not distinct from t.parent_id
   and p.sort_order<t.sort_order
), resolved as (
  select question_id,depends_on_id,target_ref from mapped where rn=1
)
insert into question_dependencies(question_id,depends_on_id,kind,strength,evidence,detected_by,confidence)
select question_id,depends_on_id,'answer_ref','required',
       'Sequential practical task: test/screenshot requires the preceding code part ('||target_ref||').',
       'migration-0085',1.0
from resolved
on conflict(question_id,depends_on_id) do update set
  kind=excluded.kind,
  strength=excluded.strength,
  evidence=excluded.evidence,
  detected_by=excluded.detected_by,
  confidence=excluded.confidence;

-- 3) High-confidence sibling dependencies. Exact-duplicate stems are expanded across variants
-- only within the same component and only when the target path resolves in the same source paper.
with seeds(from_ref,target_path,kind,strength) as (values
  ('9618/21/M/J/22 Q1(b)(ii)','1.b.i','text_ref','required'),
  ('9618/21/M/J/23 Q1(c)(ii)','1.c.i','text_ref','required'),
  ('9618/21/O/N/22 Q6(b)(ii)','6.b.i','text_ref','required'),
  ('9618/21/O/N/23 Q6(b)','6.a','text_ref','required'),
  ('9618/21/O/N/24 Q3(b)','3.a','text_ref','required'),
  ('9618/21/O/N/24 Q3(c)','3.a','text_ref','required'),
  ('9618/21/O/N/24 Q7(b)','7.a','text_ref','required'),
  ('9618/22/M/J/21 Q1(a)(ii)','1.a.i','text_ref','required'),
  ('9618/22/M/J/22 Q3(a)(ii)','3.a.i','answer_ref','required'),
  ('9618/22/M/J/22 Q4(b)','4.a','text_ref','required'),
  ('9618/22/M/J/22 Q7(b)','7.a','text_ref','required'),
  ('9618/22/M/J/24 Q6(b)(iii)','6.b.ii','answer_ref','required'),
  ('9618/23/M/J/22 Q6(b)','6.a','text_ref','required'),
  ('9618/23/M/J/24 Q4(b)(ii)','4.b.i','answer_ref','required'),
  ('9618/23/O/N/23 Q8(d)','8.c','text_ref','required'),
  ('9618/23/O/N/24 Q1(c)','1.b','text_ref','required'),
  ('9618/23/O/N/24 Q8(c)','8.b','text_ref','required'),
  ('9618/21/O/N/22 Q4(a)(ii)','4.a.i','text_ref','required'),
  ('9618/21/O/N/22 Q4(a)(iii)','4.a.i','text_ref','required'),
  ('9618/31/M/J/21 Q2(c)','2.b.i','text_ref','required'),
  ('9618/31/M/J/21 Q2(c)','2.b.ii','text_ref','required'),
  ('9618/31/M/J/23 Q1(b)','1.a','text_ref','required'),
  ('9618/31/O/N/21 Q1(a)(ii)','1.a.i','text_ref','required'),
  ('9618/31/O/N/22 Q3(d)(ii)','3.d.i','answer_ref','required'),
  ('9618/31/O/N/22 Q5(b)(ii)','5.b.i','answer_ref','required'),
  ('9618/31/O/N/23 Q9(a)(ii)','9.a.i','text_ref','required'),
  ('9618/32/O/N/22 Q4(b)','4.a','text_ref','required'),
  ('9618/32/O/N/22 Q4(c)(ii)','4.c.i','answer_ref','required'),
  ('9618/32/O/N/22 Q4(c)(ii)','4.b','answer_ref','required'),
  ('9618/32/O/N/23 Q9(a)(i)','9.a.ii','text_ref','required'),
  ('9618/22/O/N/23 Q7(b)','7.a','text_ref','required')
), seedq as (
  select s.*,q.component_id,
         regexp_replace(lower(coalesce(q.stem_md,'')),'\s+',' ','g') norm
  from seeds s
  join questions q on q.display_ref=s.from_ref
), expanded as (
  select distinct q.id question_id,s.target_path,s.kind,s.strength,q.source_paper_id
  from seedq s
  join questions q on q.component_id=s.component_id and q.marks>0
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id
  where sy.code='9618'
    and sp.kind='QP'::paper_kind
    and sp.source_url is not null
    and sp.year between 2021 and 2025
    and regexp_replace(lower(coalesce(q.stem_md,'')),'\s+',' ','g')=s.norm
), resolved as (
  select e.question_id,t.id depends_on_id,e.kind,e.strength,t.display_ref target_ref
  from expanded e
  join questions t on t.source_paper_id=e.source_paper_id and t.path=e.target_path
)
insert into question_dependencies(question_id,depends_on_id,kind,strength,evidence,detected_by,confidence)
select question_id,depends_on_id,kind,strength,
       case when kind='answer_ref'
            then 'Source wording requires a value/structure/identifier produced in '||target_ref||'.'
            else 'Source wording relies on printed material defined or shown in '||target_ref||'.'
       end,
       'migration-0085',1.0
from resolved
on conflict(question_id,depends_on_id) do update set
  kind=excluded.kind,
  strength=excluded.strength,
  evidence=excluded.evidence,
  detected_by=excluded.detected_by,
  confidence=excluded.confidence;

-- Fail closed if any high-confidence dependency class is not represented after repair.
do $$
declare
  unresolved_explicit int;
  missing_practical int;
  cross_paper int;
  self_dep int;
begin
  with mappings(from_ref,target_path) as (values
    ('9618/31/O/N/21 Q7(b)(iii)','7.b.ii'),('9618/31/O/N/21 Q7(b)(iv)','7.b.iii'),
    ('9618/32/O/N/21 Q7(b)(iii)','7.b.ii'),('9618/32/O/N/21 Q7(b)(iv)','7.b.iii'),
    ('9618/12/M/J/22 Q1(b)(ii)','1.b.i'),('9618/22/O/N/22 Q2(a)(iii)','2.a.i'),
    ('9618/31/O/N/22 Q7(c)','7.b'),('9618/33/O/N/22 Q7(c)','7.b'),
    ('9618/22/M/J/23 Q1(a)(ii)','1.a.i'),('9618/31/M/J/23 Q7(c)','7.b'),
    ('9618/31/M/J/23 Q7(d)','7.c'),('9618/32/M/J/23 Q9(d)','9.c'),
    ('9618/32/M/J/23 Q9(e)','9.d'),('9618/33/M/J/23 Q7(c)','7.b'),
    ('9618/33/M/J/23 Q7(d)','7.c'),('9618/31/M/J/24 Q6(c)(iii)','6.c.ii'),
    ('9618/32/M/J/24 Q6(c)(iii)','6.c.ii'),('9618/33/M/J/24 Q6(c)(iii)','6.c.ii'),
    ('9618/21/O/N/24 Q1(b)(ii)','1.b.i'),('9618/31/O/N/24 Q11(b)','11.a'),
    ('9618/31/O/N/24 Q7(d)(i)','7.c'),('9618/31/O/N/24 Q7(d)(ii)','7.d.i'),
    ('9618/32/O/N/24 Q11(b)','11.a'),('9618/32/O/N/24 Q6(d)','6.c'),
    ('9618/33/O/N/24 Q11(b)','11.a'),('9618/33/O/N/24 Q7(d)(i)','7.c'),
    ('9618/33/O/N/24 Q7(d)(ii)','7.d.i')
  )
  select count(*) into unresolved_explicit
  from mappings m
  left join questions f on f.display_ref=m.from_ref
  left join questions t on t.source_paper_id=f.source_paper_id and t.path=m.target_path
  where f.id is null or t.id is null
     or not exists(
       select 1 from question_dependencies qd
       where qd.question_id=f.id and qd.depends_on_id=t.id
         and qd.kind='answer_ref' and qd.strength='required'
     );

  select count(*) into missing_practical
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  join components c on c.id=q.component_id
  join syllabi s on s.id=sp.syllabus_id
  where s.code='9618'
    and sp.kind='QP'::paper_kind and sp.source_url is not null
    and sp.year between 2021 and 2025 and c.number=4 and q.marks>0
    and q.stem_md ~* 'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
    and not exists(
      select 1 from question_dependencies qd
      where qd.question_id=q.id and qd.kind='answer_ref' and qd.strength='required'
    );

  select count(*) into cross_paper
  from question_dependencies qd
  join questions q on q.id=qd.question_id
  join questions t on t.id=qd.depends_on_id
  where q.source_paper_id<>t.source_paper_id;

  select count(*) into self_dep
  from question_dependencies where question_id=depends_on_id;

  if unresolved_explicit<>0 or missing_practical<>0 or cross_paper<>0 or self_dep<>0 then
    raise exception '0085 dependency repair failed explicit=% practical=% cross_paper=% self=%',
      unresolved_explicit,missing_practical,cross_paper,self_dep;
  end if;
end $$;
