-- Source-backed normalization for repeated shortest-path marking schemes.
--
-- Published structure:
--   * working/evidence points: Max 3
--   * final-answer credit: Max 2, graduated (partial set = 1; all correct = 2)
--   * overall question Max 5
--
-- The answer group uses award_mode=point_marks so the highest matched threshold
-- wins without double-counting. Natural keys, single-wrapper eligibility,
-- downstream-use checks and post-insert validation make this idempotent.

with target(year,series,variant,display_ref) as (
  values
    (2021,'MJ',1,'5.a'),
    (2021,'MJ',2,'5.a'),
    (2021,'MJ',3,'5.a'),
    (2023,'ON',2,'8')
), resolved as (
  select t.*,q.id question_id,ms.id mark_scheme_id
  from target t
  join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=5
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=5
), eligible as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
    and not exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
), deleted as (
  delete from mark_scheme_points p using eligible e where p.mark_scheme_id=e.mark_scheme_id returning p.mark_scheme_id
), groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select e.mark_scheme_id,x.label,x.n_required,x.marks_per_point,x.max_marks,x.sort_order,x.award_mode
  from eligible e cross join (values
    ('working',3,1,3,1,'fixed'),
    ('answers',1,1,2,2,'point_marks')
  ) x(label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  where exists(select 1 from deleted d where d.mark_scheme_id=e.mark_scheme_id)
  returning id,mark_scheme_id,label
), defs(code,point_text,group_label,marks,requires,sort_order) as (
  values
    ('MP1','Initialisation: set the start/base town distance to 0.','working',1,'[]'::jsonb,1),
    ('MP2','Set the remaining town distances to infinity.','working',1,'["MP1"]'::jsonb,2),
    ('MP3','Evidence that values at nodes are updated.','working',1,'[]'::jsonb,3),
    ('MP4','Evidence that visited node(s) are identified.','working',1,'[]'::jsonb,4),
    ('MP5','Evidence of a correct calculation of at least one route.','working',1,'[]'::jsonb,5),
    ('MP6','Evidence that more than one route has been calculated for at least one town.','working',1,'[]'::jsonb,6),
    ('ANS1','Partial final-answer threshold: the published required subset of final town values is correct.','answers',1,'[]'::jsonb,7),
    ('ANS2','All six published final town values are correct.','answers',2,'[]'::jsonb,8)
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select e.mark_scheme_id,g.id,d.code,d.point_text,d.marks,'[]'::jsonb,'[]'::jsonb,d.requires,false,d.sort_order
from eligible e cross join defs d join groups g on g.mark_scheme_id=e.mark_scheme_id and g.label=d.group_label
where exists(select 1 from deleted x where x.mark_scheme_id=e.mark_scheme_id);

with target(year,series,variant,display_ref) as (
  values (2021,'MJ',1,'5.a'),(2021,'MJ',2,'5.a'),(2021,'MJ',3,'5.a'),(2023,'ON',2,'8')
), resolved as (
  select ms.id mark_scheme_id
  from target t
  join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=5
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=5
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=8
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=2
    and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='working' and g.n_required=3 and g.max_marks=3 and g.award_mode='fixed')
    and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='answers' and g.n_required=1 and g.max_marks=2 and g.award_mode='point_marks')
    and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='ANS1' and p.marks=1)
    and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='ANS2' and p.marks=2)
)
update mark_schemes ms set scheme_type='any_n_from_m'::scheme_type,prompt_version='atomic-source-shortest-path-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
