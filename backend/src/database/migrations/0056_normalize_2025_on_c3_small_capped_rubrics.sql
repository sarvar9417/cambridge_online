-- Source-backed normalization for 9618/31/O/N/25 Q5(a), Q6(a), Q6(b)(i).
-- Replaces only unused one-point + one g1:main placeholder wrappers.

with target(path,expected_marks,scheme_kind) as (
  values ('5.a',2,'any_n_from_m'),('6.a',3,'all_required'),('6.b.i',2,'any_n_from_m')
), resolved as (
  select t.*,q.id question_id,ms.id mark_scheme_id,(select g.id from mark_scheme_groups g where g.mark_scheme_id=ms.id limit 1) old_group_id
  from target t
  join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=1 and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), eligible as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=1
    and exists(select 1 from mark_scheme_groups g where g.id=r.old_group_id and g.label='g1:main' and g.n_required=1 and g.marks_per_point=1 and g.max_marks=r.expected_marks and g.award_mode='fixed')
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
), group_defs(path,label,n_required,marks_per_point,max_marks,award_mode,sort_order) as (
  values ('5.a','certificate_fields',2,1,2,'fixed',1),('6.b.i','accuracy',1,1,2,'point_marks',1)
), point_defs(path,code,point_text,group_label,point_marks,sort_order) as (
  values
    ('5.a','F1','Name of certificate holder / Subject.','certificate_fields',1,1),
    ('5.a','F2','Serial number.','certificate_fields',1,2),
    ('5.a','F3','Version number.','certificate_fields',1,3),
    ('5.a','F4','Expiration date / start date / validity period.','certificate_fields',1,4),
    ('5.a','F5','Certificate holder public key / subject public key.','certificate_fields',1,5),
    ('5.a','F6','Subject digital signature.','certificate_fields',1,6),
    ('5.a','F7','Certificate issuer / digital signature of the CA.','certificate_fields',1,7),
    ('6.a','MP1','All four working columns P, Q, R and S are correct.','',1,1),
    ('6.a','MP2','The first four rows of column Z are correct: 0, 0, 1, 1.','',1,2),
    ('6.a','MP3','The second four rows of column Z are correct: 0, 0, 1, 1.','',1,3),
    ('6.b.i','ONE_ERROR','Karnaugh map has exactly one error.','accuracy',1,1),
    ('6.b.i','NO_ERRORS','Karnaugh map has no errors.','accuracy',2,2)
), validated as (
  select e.* from eligible e
  where (e.scheme_kind='all_required' and (select coalesce(sum(p.point_marks),0) from point_defs p where p.path=e.path)=e.expected_marks)
     or (e.scheme_kind='any_n_from_m' and (select coalesce(sum(g.max_marks),0) from group_defs g where g.path=e.path)=e.expected_marks)
), deleted_points as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
), deleted_groups as (
  delete from mark_scheme_groups g using validated v where g.id=v.old_group_id and exists(select 1 from deleted_points d where d.mark_scheme_id=v.mark_scheme_id) returning g.mark_scheme_id
), groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select v.mark_scheme_id,g.label,g.n_required,g.marks_per_point,g.max_marks,g.sort_order,g.award_mode
  from validated v join group_defs g on g.path=v.path
  where exists(select 1 from deleted_groups d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,g.id,p.code,p.point_text,p.point_marks,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,false,p.sort_order
from validated v join point_defs p on p.path=v.path
left join groups g on g.mark_scheme_id=v.mark_scheme_id and g.label=nullif(p.group_label,'')
where exists(select 1 from deleted_groups d where d.mark_scheme_id=v.mark_scheme_id)
  and (nullif(p.group_label,'') is null or g.id is not null);

with target(path,expected_marks,scheme_kind,expected_points,expected_groups) as (
  values ('5.a',2,'any_n_from_m',7,1),('6.a',3,'all_required',3,0),('6.b.i',2,'any_n_from_m',2,1)
), resolved as (
  select t.*,ms.id mark_scheme_id from target t
  join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=1 and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_points
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_groups
    and (r.expected_groups=0 or (select coalesce(sum(g.max_marks),0) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_marks)
    and (r.path<>'6.b.i' or exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.award_mode='point_marks' and g.n_required=1 and g.max_marks=2))
)
update mark_schemes ms set scheme_type=v.scheme_kind::scheme_type,prompt_version='atomic-source-2025-on-c3-capped-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
