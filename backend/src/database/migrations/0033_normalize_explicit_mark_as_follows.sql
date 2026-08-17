-- Source-backed atomic normalization for three legacy Paper 2 schemes whose
-- published Cambridge guidance contains one unambiguous `Mark as follows`
-- block with MP1..MPn and max_marks = n.
--
-- Safety rules:
--   * locate schemes by natural paper/question keys, never generated UUIDs
--   * only replace the original single structural wrapper
--   * refuse destructive replacement implicitly when grading/error/flashcard
--     rows already reference that wrapper (the eligible CTE then excludes it)
--   * preserve explicit semantic dependencies stated by the published rubric
--   * idempotent: already-normalized schemes are left unchanged

with target(year, series, component, variant, display_ref, expected_marks) as (
  values
    (2023, 'ON'::exam_series, 2, 1, '8.a', 7),
    (2024, 'ON'::exam_series, 2, 2, '4',   6),
    (2024, 'ON'::exam_series, 2, 2, '8.b', 7)
), resolved as (
  select ms.id as mark_scheme_id,
         ms.guidance_md,
         t.year,
         t.series,
         t.component,
         t.variant,
         t.display_ref,
         t.expected_marks
  from target t
  join source_papers sp
    on sp.year=t.year
   and sp.series=t.series
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
    and not exists(
      select 1
      from grading_points gp
      join mark_scheme_points p on p.id=gp.mark_scheme_point_id
      where p.mark_scheme_id=r.mark_scheme_id
    )
    and not exists(
      select 1
      from error_patterns ep
      join mark_scheme_points p on p.id=ep.mark_scheme_point_id
      where p.mark_scheme_id=r.mark_scheme_id
    )
    and not exists(
      select 1
      from flashcards f
      join mark_scheme_points p on p.id=f.source_mark_scheme_point_id
      where p.mark_scheme_id=r.mark_scheme_id
    )
), parsed as (
  select e.*,
         (m[1])::integer as mp_no,
         regexp_replace(trim(m[2]), E'\\s+', ' ', 'g') as point_text
  from eligible e
  cross join lateral regexp_matches(
    e.guidance_md,
    E'(?n)MP([0-9]+)[[:space:]]+(.+?)(?=\\nMP[0-9]+|\\nPUBLISHED|$)',
    'g'
  ) m
), valid as (
  select mark_scheme_id
  from parsed
  group by mark_scheme_id, expected_marks
  having count(*)=expected_marks
     and count(distinct mp_no)=expected_marks
     and min(mp_no)=1
     and max(mp_no)=expected_marks
), deleted as (
  delete from mark_scheme_points p
  using valid v
  where p.mark_scheme_id=v.mark_scheme_id
  returning p.mark_scheme_id
), inserted as (
  insert into mark_scheme_points(
    mark_scheme_id, group_id, code, text, marks,
    accept, reject, requires, is_bod, sort_order
  )
  select p.mark_scheme_id,
         null,
         'MP' || p.mp_no,
         p.point_text,
         1,
         '[]'::jsonb,
         '[]'::jsonb,
         case
           -- 2023 O/N 21 Q8(a): MP5 is the complete form of MP4;
           -- MP6 explicitly requires the correct MP4 message.
           when p.year=2023 and p.component=2 and p.variant=1 and p.display_ref='8.a'
                and p.mp_no in (5,6) then '["MP4"]'::jsonb
           -- 2024 O/N 22 Q4: MP5 is "Completely correct MP4";
           -- MP6 explicitly says both messages must follow successful MP4.
           when p.year=2024 and p.component=2 and p.variant=2 and p.display_ref='4'
                and p.mp_no in (5,6) then '["MP4"]'::jsonb
           -- 2024 O/N 22 Q8(b): MP7 explicitly writes the Line from MP4.
           when p.year=2024 and p.component=2 and p.variant=2 and p.display_ref='8.b'
                and p.mp_no=7 then '["MP4"]'::jsonb
           else '[]'::jsonb
         end,
         false,
         p.mp_no
  from parsed p
  join valid v on v.mark_scheme_id=p.mark_scheme_id
  where exists(select 1 from deleted d where d.mark_scheme_id=p.mark_scheme_id)
  returning mark_scheme_id
)
update mark_schemes ms
set scheme_type='all_required'::scheme_type,
    prompt_version='atomic-source-mp-v2',
    updated_at=now()
where exists(
  select 1 from inserted i where i.mark_scheme_id=ms.id
);
