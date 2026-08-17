-- Source-backed atomic normalization for repeated 2021 M/J Component 3 rubrics.
-- The three variants publish the same deterministic marking structure for the
-- selected questions. Formula layouts whose extraction loses significant
-- notation (for example Q7(c) overbars) are deliberately excluded.
--
-- Safety: natural keys, single-wrapper-only, no downstream assignment/answer/
-- grading/error/flashcard use, and idempotent re-runs.

with target as (
  select 2021 as year,
         'MJ'::exam_series as series,
         3 as component,
         v.variant,
         r.display_ref,
         r.expected_marks
  from (values (1),(2),(3)) v(variant)
  cross join (values
    ('1.a',3),
    ('1.b',3),
    ('1.c',3),
    ('4.d',2),
    ('7.a',3),
    ('9.c',4)
  ) r(display_ref,expected_marks)
), resolved as (
  select t.*, q.id question_id, ms.id mark_scheme_id
  from target t
  join source_papers sp
    on sp.year=t.year
   and sp.series=t.series
   and sp.variant=t.variant
   and sp.kind='QP'::paper_kind
  join components c
    on c.id=sp.component_id and c.number=t.component
  join questions q
    on q.source_paper_id=sp.id
   and q.display_ref=t.display_ref
   and q.marks=t.expected_marks
  join mark_schemes ms
    on ms.question_id=q.id and ms.max_marks=t.expected_marks
), eligible as (
  select r.*
  from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(
      select 1 from grading_points gp
      join mark_scheme_points p on p.id=gp.mark_scheme_point_id
      where p.mark_scheme_id=r.mark_scheme_id
    )
    and not exists(
      select 1 from error_patterns ep
      join mark_scheme_points p on p.id=ep.mark_scheme_point_id
      where p.mark_scheme_id=r.mark_scheme_id
    )
    and not exists(
      select 1 from flashcards f
      join mark_scheme_points p on p.id=f.source_mark_scheme_point_id
      where p.mark_scheme_id=r.mark_scheme_id
    )
), point_defs(display_ref,code,point_text,sort_order) as (
  values
    ('1.a','MP1','Working shows a valid calculation or conversion of the mantissa for -7.25.',1),
    ('1.a','MP2','Working shows a valid calculation or use of the exponent for the normalized representation.',2),
    ('1.a','MP3','Correct final normalized representation: mantissa 1000110000 and exponent 000011.',3),

    ('1.b','MP1','Working correctly determines the exponent as 7.',1),
    ('1.b','MP2','Working correctly determines the mantissa / binary value for the represented number.',2),
    ('1.b','MP3','Correct final denary answer: -78.25.',3),

    ('1.c','MP1','Working correctly accounts for the six-place normalization shift and corresponding exponent change.',1),
    ('1.c','MP2','Correct normalized mantissa: 0111000000.',2),
    ('1.c','MP3','Correct normalized exponent: 100001.',3),

    ('4.d','MP1','Correct expression structure: (a + b) / (c / d).',1),
    ('4.d','MP2','Correct substitution: (17 + 3) / (48 / 12).',2),

    ('7.a','MP1','Working columns P, Q and R are all correct.',1),
    ('7.a','MP2','Column Y is correct for all eight rows: 0,1,1,0,1,0,0,1.',2),
    ('7.a','MP3','Column Z is correct for all eight rows: 0,0,0,1,0,1,1,1.',3),

    ('9.c','MP1','The declarative program-code example is correctly identified as Declarative.',1),
    ('9.c','MP2','The FOR-loop program-code example is correctly identified as Procedural / imperative.',2),
    ('9.c','MP3','The assembly-instruction program-code example is correctly identified as Low-level / assembly.',3),
    ('9.c','MP4','The class-based program-code example is correctly identified as Object oriented / OOP.',4)
), deleted as (
  delete from mark_scheme_points p
  using eligible e
  where p.mark_scheme_id=e.mark_scheme_id
  returning p.mark_scheme_id
), inserted as (
  insert into mark_scheme_points(
    mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order
  )
  select e.mark_scheme_id,
         null,
         d.code,
         d.point_text,
         1,
         '[]'::jsonb,
         '[]'::jsonb,
         '[]'::jsonb,
         false,
         d.sort_order
  from eligible e
  join point_defs d on d.display_ref=e.display_ref
  where exists(select 1 from deleted x where x.mark_scheme_id=e.mark_scheme_id)
  returning mark_scheme_id
)
update mark_schemes ms
set scheme_type='all_required'::scheme_type,
    prompt_version='atomic-source-2021-c3-v1',
    updated_at=now()
where exists(select 1 from inserted i where i.mark_scheme_id=ms.id);
