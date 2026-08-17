-- Source-backed normalization for four repeated Component 3 textual families.
-- Spatial/symbol-loss rubrics are deliberately excluded. Only unused single wrappers are eligible.

with target(year,series,variant,display_ref,expected_marks,scheme_kind) as (
  values
    (2022,'MJ',1,'5.a',2,'all_required'),(2022,'MJ',3,'5.a',2,'all_required'),
    (2022,'MJ',1,'7.a',5,'all_required'),(2022,'MJ',3,'7.a',5,'all_required'),
    (2024,'MJ',1,'2.c',2,'any_n_from_m'),(2024,'MJ',3,'2.c',2,'any_n_from_m'),
    (2024,'MJ',1,'6.a',3,'all_required'),(2024,'MJ',3,'6.a',3,'all_required')
), resolved as (
  select t.*,q.id question_id,ms.id mark_scheme_id
  from target t join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), eligible as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
    and not exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
), group_defs(year,display_ref,label,n_required,max_marks,sort_order) as (
  values (2024,'2.c','protocol',1,1,1),(2024,'2.c','purpose',1,1,2)
), point_defs(year,display_ref,code,point_text,group_label,requires,sort_order) as (
  values
    (2022,'5.a','MP1','First postfix expression: jk+.',null,'[]'::jsonb,1),
    (2022,'5.a','MP2','Second postfix expression: jk-/.',null,'[]'::jsonb,2),

    (2022,'7.a','MP1','Acrylic has attribute Soft of type BOOLEAN.',null,'[]'::jsonb,1),
    (2022,'7.a','MP2','Wool has attribute WoolType with a suitable data type.',null,'[]'::jsonb,2),
    (2022,'7.a','MP3','Acrylic and Wool have method YarnInfo().',null,'[]'::jsonb,3),
    (2022,'7.a','MP4','At least one of Acrylic, Wool and Mix inherits from Yarn.',null,'[]'::jsonb,4),
    (2022,'7.a','MP5','Acrylic, Wool and Mix all inherit from Yarn.','', '["MP4"]'::jsonb,5),

    (2024,'2.c','P_HTTP','HTTP/HTTPS.','protocol','[]'::jsonb,1),
    (2024,'2.c','P_FTP','FTP.','protocol','[]'::jsonb,2),
    (2024,'2.c','P_POP3','POP3.','protocol','[]'::jsonb,3),
    (2024,'2.c','P_IMAP','IMAP.','protocol','[]'::jsonb,4),
    (2024,'2.c','P_SMTP','SMTP.','protocol','[]'::jsonb,5),
    (2024,'2.c','P_BIT','BitTorrent.','protocol','[]'::jsonb,6),
    (2024,'2.c','D_HTTP','Transfers files / hypertext documents that make up web pages on the World Wide Web.','purpose','["P_HTTP"]'::jsonb,7),
    (2024,'2.c','D_FTP','Transfers files from a server to a client on a network.','purpose','["P_FTP"]'::jsonb,8),
    (2024,'2.c','D_POP3','Handles receiving emails.','purpose','["P_POP3"]'::jsonb,9),
    (2024,'2.c','D_IMAP','Handles receiving emails.','purpose','["P_IMAP"]'::jsonb,10),
    (2024,'2.c','D_SMTP','Handles sending emails.','purpose','["P_SMTP"]'::jsonb,11),
    (2024,'2.c','D_BIT','Provides peer-to-peer file sharing.','purpose','["P_BIT"]'::jsonb,12),

    (2024,'6.a','MP1','All four working columns P, Q, R and S are correct.',null,'[]'::jsonb,1),
    (2024,'6.a','MP2','The first four rows of column Z are correct: 1, 1, 0, 0.',null,'[]'::jsonb,2),
    (2024,'6.a','MP3','The second four rows of column Z are correct: 0, 1, 1, 1.',null,'[]'::jsonb,3)
), validated as (
  select e.* from eligible e
  where (e.scheme_kind='all_required' and (select count(*) from point_defs p where p.year=e.year and p.display_ref=e.display_ref)=e.expected_marks)
     or (e.scheme_kind='any_n_from_m' and (select coalesce(sum(g.max_marks),0) from group_defs g where g.year=e.year and g.display_ref=e.display_ref)=e.expected_marks)
), deleted as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
), groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select v.mark_scheme_id,g.label,g.n_required,1,g.max_marks,g.sort_order,'fixed'
  from validated v join group_defs g on g.year=v.year and g.display_ref=v.display_ref
  where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,g.id,p.code,p.point_text,1,'[]'::jsonb,'[]'::jsonb,p.requires,false,p.sort_order
from validated v join point_defs p on p.year=v.year and p.display_ref=v.display_ref
left join groups g on g.mark_scheme_id=v.mark_scheme_id and g.label=nullif(p.group_label,'')
where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
  and (nullif(p.group_label,'') is null or g.id is not null);

with target(year,series,variant,display_ref,expected_marks,scheme_kind,expected_points) as (
  values
    (2022,'MJ',1,'5.a',2,'all_required',2),(2022,'MJ',3,'5.a',2,'all_required',2),
    (2022,'MJ',1,'7.a',5,'all_required',5),(2022,'MJ',3,'7.a',5,'all_required',5),
    (2024,'MJ',1,'2.c',2,'any_n_from_m',12),(2024,'MJ',3,'2.c',2,'any_n_from_m',12),
    (2024,'MJ',1,'6.a',3,'all_required',3),(2024,'MJ',3,'6.a',3,'all_required',3)
), resolved as (
  select t.*,ms.id mark_scheme_id from target t
  join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_points
    and (r.scheme_kind='all_required' or (select coalesce(sum(g.max_marks),0) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_marks)
    and (r.display_ref<>'7.a' or exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP5' and p.requires='["MP4"]'::jsonb))
)
update mark_schemes ms set scheme_type=v.scheme_kind::scheme_type,prompt_version='atomic-source-repeated-c3-text-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
