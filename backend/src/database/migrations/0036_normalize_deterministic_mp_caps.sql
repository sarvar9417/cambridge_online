-- Source-backed atomic normalization for deterministic 2023-2024 C2/C3 rubrics.
--
-- Included families:
--   * explicit MP1..MPn lists with exact or overall Max-n scoring
--   * explicit section caps (e.g. benefit/drawback, one mark from each pool)
--
-- Excluded here on purpose:
--   * alternative-solution rubrics whose mark points are mutually exclusive
--   * table/matching layouts where atomic row semantics are not explicit
--   * weighted/ambiguous credit rules
--
-- Safety:
--   * natural paper/question keys only; no generated UUIDs
--   * only a single structural wrapper may be replaced
--   * refuse replacement when assignments, answers, grading points,
--     error patterns, or flashcards already use the target
--   * refuse schemes with pre-existing groups
--   * validate point/group definitions before deleting the wrapper
--   * idempotent: already-normalized schemes are not eligible

with target(year, series, component, variant, display_ref, expected_marks, scheme_kind) as (
  values
    (2023,'ON',2,3,'4.a',6,'all_required'),
    (2023,'ON',2,1,'6.a',7,'any_n_from_m'),
    (2023,'MJ',3,1,'9.b',4,'any_n_from_m'),
    (2023,'MJ',3,3,'9.b',4,'any_n_from_m'),
    (2024,'MJ',3,1,'10.c',2,'any_n_from_m'),
    (2024,'MJ',3,3,'10.c',2,'any_n_from_m')
), group_defs(year, series, component, variant, display_ref, label, n_required, marks_per_point, max_marks, sort_order) as (
  values
    (2023,'ON',2,1,'6.a','points',7,1,7,1),
    (2023,'MJ',3,1,'9.b','benefits',2,1,2,1),
    (2023,'MJ',3,1,'9.b','drawbacks',2,1,2,2),
    (2023,'MJ',3,3,'9.b','benefits',2,1,2,1),
    (2023,'MJ',3,3,'9.b','drawbacks',2,1,2,2),
    (2024,'MJ',3,1,'10.c','big-o',1,1,1,1),
    (2024,'MJ',3,1,'10.c','growth',1,1,1,2),
    (2024,'MJ',3,3,'10.c','big-o',1,1,1,1),
    (2024,'MJ',3,3,'10.c','growth',1,1,1,2)
), point_defs(year, series, component, variant, display_ref, code, point_text, group_label, requires, sort_order) as (
  values
    (2023,'ON',2,3,'4.a','MP1','Procedure heading and ending',null,'[]'::jsonb,1),
    (2023,'ON',2,3,'4.a','MP2','Local loop counter Count as integer',null,'[]'::jsonb,2),
    (2023,'ON',2,3,'4.a','MP3','Loop to iterate 25 times or more for each unique number',null,'[]'::jsonb,3),
    (2023,'ON',2,3,'4.a','MP4','‘Attempt’ to generate a random number including use of INT() in a loop',null,'[]'::jsonb,4),
    (2023,'ON',2,3,'4.a','MP5','Ensure that number generated is greater than previous and change ‘previous’',null,'[]'::jsonb,5),
    (2023,'ON',2,3,'4.a','MP6','Output random number after an attempt at MP5 in a loop',null,'["MP5"]'::jsonb,6),

    (2023,'ON',2,1,'6.a','MP1','Procedure heading, including parameters, and ending','points','[]'::jsonb,1),
    (2023,'ON',2,1,'6.a','MP2','Produce concatenated string','points','[]'::jsonb,2),
    (2023,'ON',2,1,'6.a','MP3','… Check whether resulting string would be too long','points','["MP2"]'::jsonb,3),
    (2023,'ON',2,1,'6.a','MP4','If so, then output old MyString','points','[]'::jsonb,4),
    (2023,'ON',2,1,'6.a','MP5','… and assign NewString to MyString','points','["MP4"]'::jsonb,5),
    (2023,'ON',2,1,'6.a','MP6','Else concatenate NewString to MyString','points','[]'::jsonb,6),
    (2023,'ON',2,1,'6.a','MP7','(test for length < 255) Test EOL – If TRUE then Output','points','[]'::jsonb,7),
    (2023,'ON',2,1,'6.a','MP8','… and reset MyString to empty string','points','["MP7"]'::jsonb,8),

    (2023,'MJ',3,1,'9.b','G1MP1','Provides security based on laws of physics rather than mathematical algorithms, so more secure.','benefits','[]'::jsonb,1),
    (2023,'MJ',3,1,'9.b','G1MP2','To protect the security of data transmitted over fibre optic cables.','benefits','[]'::jsonb,2),
    (2023,'MJ',3,1,'9.b','G1MP3','Virtually unhackable.','benefits','[]'::jsonb,3),
    (2023,'MJ',3,1,'9.b','G1MP4','The performance of quantum cryptography is continuously improved, making it suitable for most valuable government/industrial secrets.','benefits','[]'::jsonb,4),
    (2023,'MJ',3,1,'9.b','G1MP5','Longer keys can be used','benefits','[]'::jsonb,5),
    (2023,'MJ',3,1,'9.b','G1MP6','Eavesdropping can be detected','benefits','[]'::jsonb,6),
    (2023,'MJ',3,1,'9.b','G2MP1','Lacks many vital features such as digital signature, certified mail, etc.','drawbacks','[]'::jsonb,7),
    (2023,'MJ',3,1,'9.b','G2MP2','High cost of purchasing / maintaining equipment required.','drawbacks','[]'::jsonb,8),
    (2023,'MJ',3,1,'9.b','G2MP3','Currently only works over relatively short distances.','drawbacks','[]'::jsonb,9),
    (2023,'MJ',3,1,'9.b','G2MP4','Error rates are relatively high as technology is still being developed.','drawbacks','[]'::jsonb,10),
    (2023,'MJ',3,1,'9.b','G2MP5','Polarisation of light can change during transmission.','drawbacks','[]'::jsonb,11),
    (2023,'MJ',3,1,'9.b','G2MP6','Allows criminals and terrorists to hide their communications.','drawbacks','[]'::jsonb,12),

    (2023,'MJ',3,3,'9.b','G1MP1','Provides security based on laws of physics rather than mathematical algorithms, so more secure.','benefits','[]'::jsonb,1),
    (2023,'MJ',3,3,'9.b','G1MP2','To protect the security of data transmitted over fibre optic cables.','benefits','[]'::jsonb,2),
    (2023,'MJ',3,3,'9.b','G1MP3','Virtually unhackable.','benefits','[]'::jsonb,3),
    (2023,'MJ',3,3,'9.b','G1MP4','The performance of quantum cryptography is continuously improved, making it suitable for most valuable government/industrial secrets.','benefits','[]'::jsonb,4),
    (2023,'MJ',3,3,'9.b','G1MP5','Longer keys can be used','benefits','[]'::jsonb,5),
    (2023,'MJ',3,3,'9.b','G1MP6','Eavesdropping can be detected','benefits','[]'::jsonb,6),
    (2023,'MJ',3,3,'9.b','G2MP1','Lacks many vital features such as digital signature, certified mail, etc.','drawbacks','[]'::jsonb,7),
    (2023,'MJ',3,3,'9.b','G2MP2','High cost of purchasing / maintaining equipment required.','drawbacks','[]'::jsonb,8),
    (2023,'MJ',3,3,'9.b','G2MP3','Currently only works over relatively short distances.','drawbacks','[]'::jsonb,9),
    (2023,'MJ',3,3,'9.b','G2MP4','Error rates are relatively high as technology is still being developed.','drawbacks','[]'::jsonb,10),
    (2023,'MJ',3,3,'9.b','G2MP5','Polarisation of light can change during transmission.','drawbacks','[]'::jsonb,11),
    (2023,'MJ',3,3,'9.b','G2MP6','Allows criminals and terrorists to hide their communications.','drawbacks','[]'::jsonb,12),

    (2024,'MJ',3,1,'10.c','MP1','Big O for a binary search is O(Log 2 n).','big-o','[]'::jsonb,1),
    (2024,'MJ',3,1,'10.c','MP2','Big O notation is used to indicate the time/space complexity of an algorithm.','big-o','[]'::jsonb,2),
    (2024,'MJ',3,1,'10.c','MP3','The time taken to complete the search increases logarithmically as the number of search items increases linearly','growth','[]'::jsonb,3),
    (2024,'MJ',3,1,'10.c','MP4','The time taken to complete the search increases linearly as the number of search items increases exponentially','growth','[]'::jsonb,4),
    (2024,'MJ',3,1,'10.c','MP5','As the search field is repeatedly getting smaller, the number of comparisons made before the item is found, or the number of items runs out, is relatively small.','growth','[]'::jsonb,5),

    (2024,'MJ',3,3,'10.c','MP1','Big O for a binary search is O(Log 2 n).','big-o','[]'::jsonb,1),
    (2024,'MJ',3,3,'10.c','MP2','Big O notation is used to indicate the time/space complexity of an algorithm.','big-o','[]'::jsonb,2),
    (2024,'MJ',3,3,'10.c','MP3','The time taken to complete the search increases logarithmically as the number of search items increases linearly','growth','[]'::jsonb,3),
    (2024,'MJ',3,3,'10.c','MP4','The time taken to complete the search increases linearly as the number of search items increases exponentially','growth','[]'::jsonb,4),
    (2024,'MJ',3,3,'10.c','MP5','As the search field is repeatedly getting smaller, the number of comparisons made before the item is found, or the number of items runs out, is relatively small.','growth','[]'::jsonb,5)
), resolved as (
  select t.*, q.id question_id, ms.id mark_scheme_id
  from target t
  join source_papers sp
    on sp.year=t.year
   and sp.series::text=t.series
   and sp.variant=t.variant
   and sp.kind='QP'::paper_kind
  join components c
    on c.id=sp.component_id
   and c.number=t.component
  join questions q
    on q.source_paper_id=sp.id
   and q.display_ref=t.display_ref
   and q.marks=t.expected_marks
  join mark_schemes ms
    on ms.question_id=q.id
   and ms.max_marks=t.expected_marks
), eligible as (
  select r.*
  from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
    and not exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)
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
), validated as (
  select e.*
  from eligible e
  where (select count(*) from point_defs p
         where p.year=e.year and p.series=e.series and p.component=e.component
           and p.variant=e.variant and p.display_ref=e.display_ref) > 0
    and (select count(*) from point_defs p
         where p.year=e.year and p.series=e.series and p.component=e.component
           and p.variant=e.variant and p.display_ref=e.display_ref)
        = (select count(distinct p.code) from point_defs p
           where p.year=e.year and p.series=e.series and p.component=e.component
             and p.variant=e.variant and p.display_ref=e.display_ref)
    and (
      (e.scheme_kind='all_required'
       and (select count(*) from point_defs p
            where p.year=e.year and p.series=e.series and p.component=e.component
              and p.variant=e.variant and p.display_ref=e.display_ref)=e.expected_marks
       and not exists(select 1 from group_defs g
                      where g.year=e.year and g.series=e.series and g.component=e.component
                        and g.variant=e.variant and g.display_ref=e.display_ref))
      or
      (e.scheme_kind='any_n_from_m'
       and (select coalesce(sum(g.max_marks),0) from group_defs g
            where g.year=e.year and g.series=e.series and g.component=e.component
              and g.variant=e.variant and g.display_ref=e.display_ref)=e.expected_marks
       and not exists(
         select 1 from point_defs p
         where p.year=e.year and p.series=e.series and p.component=e.component
           and p.variant=e.variant and p.display_ref=e.display_ref
           and (p.group_label is null or not exists(
             select 1 from group_defs g
             where g.year=e.year and g.series=e.series and g.component=e.component
               and g.variant=e.variant and g.display_ref=e.display_ref
               and g.label=p.group_label
           ))
       ))
    )
), deleted as (
  delete from mark_scheme_points p
  using validated v
  where p.mark_scheme_id=v.mark_scheme_id
  returning p.mark_scheme_id
), inserted_groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select v.mark_scheme_id,g.label,g.n_required,g.marks_per_point,g.max_marks,g.sort_order,'fixed'
  from validated v
  join group_defs g
    on g.year=v.year and g.series=v.series and g.component=v.component
   and g.variant=v.variant and g.display_ref=v.display_ref
  where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
), inserted_points as (
  insert into mark_scheme_points(
    mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order
  )
  select v.mark_scheme_id,
         ig.id,
         p.code,
         p.point_text,
         1,
         '[]'::jsonb,
         '[]'::jsonb,
         p.requires,
         false,
         p.sort_order
  from validated v
  join point_defs p
    on p.year=v.year and p.series=v.series and p.component=v.component
   and p.variant=v.variant and p.display_ref=v.display_ref
  left join inserted_groups ig
    on ig.mark_scheme_id=v.mark_scheme_id
   and ig.label=p.group_label
  where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
    and (p.group_label is null or ig.id is not null)
  returning mark_scheme_id
), updated as (
  update mark_schemes ms
  set scheme_type=v.scheme_kind::scheme_type,
      prompt_version='atomic-source-deterministic-v1',
      updated_at=now()
  from validated v
  where ms.id=v.mark_scheme_id
    and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)
        = (select count(*) from point_defs p
           where p.year=v.year and p.series=v.series and p.component=v.component
             and p.variant=v.variant and p.display_ref=v.display_ref)
  returning ms.id
)
select count(distinct id) normalized_schemes from updated;
