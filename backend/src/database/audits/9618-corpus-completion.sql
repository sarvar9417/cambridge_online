-- Final blocking audit for the source-backed Cambridge 9618 corpus.
-- Read-only: raises on structural/taxonomy/manual-boundary/scorer/dependency integrity failures.
--
-- Important release semantics:
--   * every check is explicitly scoped to syllabus 9618;
--   * official-paper completeness is occurrence-aware after canonical question identity;
--   * a source-verified canonical approval is authoritative even when an older
--     probabilistic taxonomy confidence value remains below the review threshold;
--   * scheme_type=manual_only is itself a deterministic-marking boundary and does
--     not require a legacy manual-* prompt_version prefix.

do $$
declare
  structural int;
  cross_sub int; out_sub int; cross_lo int; out_lo int; lo_owner int; low_flag int;
  c13_manual int; c4_manual int;
  bad_capacity int; bad_group int; missing_dep int; self_dep int; cycles int;
  q_missing_answer int; q_missing_practical int; q_cross int; q_self int; q_cycles int;
begin
  -- Every official/source-backed 9618 QP must retain a 75-mark question occurrence
  -- set, matching 75-mark schemes and complete primary taxonomy/LO coverage.
  with per as (
    select sp.id,
      count(q.id) filter(where q.marks>0) leaves,
      coalesce(sum(q.marks) filter(where q.marks>0),0) qp_marks,
      count(ms.id) filter(where q.marks>0) schemes,
      coalesce(sum(ms.max_marks) filter(where q.marks>0),0) ms_marks,
      count(q.id) filter(where q.marks>0 and (select count(*) from question_subtopics qs where qs.question_id=q.id and qs.is_primary)<>1) bad_primary,
      count(q.id) filter(where q.marks>0 and not exists(select 1 from question_learning_objectives qlo where qlo.question_id=q.id)) bad_lo
    from source_papers sp
    join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
    left join question_source_occurrences o on o.source_paper_id=sp.id
    left join questions q on q.id=o.question_id
    left join mark_schemes ms on ms.question_id=q.id
    where sp.kind='QP'::paper_kind and sp.source_url is not null
    group by sp.id
  )
  select count(*) into structural from per
  where not(qp_marks=75 and ms_marks=75 and schemes=leaves and bad_primary=0 and bad_lo=0);

  select count(*) into cross_sub
  from question_subtopics qs
  join questions q on q.id=qs.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  join subtopics st on st.id=qs.subtopic_id
  join topics t on t.id=st.topic_id
  where q.marks>0 and sp.source_url is not null and t.syllabus_id<>sp.syllabus_id;

  select count(*) into out_sub
  from question_subtopics qs
  join questions q on q.id=qs.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  join subtopics st on st.id=qs.subtopic_id
  where q.marks>0 and sp.source_url is not null
    and not exists(
      select 1 from component_topics ct
      where ct.component_id=q.component_id and ct.topic_id=st.topic_id
    );

  select count(*) into cross_lo
  from question_learning_objectives qlo
  join questions q on q.id=qlo.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  join learning_objectives lo on lo.id=qlo.lo_id
  join subtopics st on st.id=lo.subtopic_id
  join topics t on t.id=st.topic_id
  where q.marks>0 and sp.source_url is not null and t.syllabus_id<>sp.syllabus_id;

  select count(*) into out_lo
  from question_learning_objectives qlo
  join questions q on q.id=qlo.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  where q.marks>0 and sp.source_url is not null
    and not exists(
      select 1 from component_learning_objectives clo
      where clo.component_id=q.component_id and clo.learning_objective_id=qlo.lo_id
    );

  select count(*) into lo_owner
  from question_learning_objectives qlo
  join questions q on q.id=qlo.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  join learning_objectives lo on lo.id=qlo.lo_id
  where q.marks>0 and sp.source_url is not null
    and not exists(
      select 1 from question_subtopics qs
      where qs.question_id=q.id and qs.subtopic_id=lo.subtopic_id
    );

  -- Low-confidence machine mappings remain release-blocking unless either a human
  -- review exists, the question is already explicitly held in needs_review with
  -- the taxonomy-review marker, or the source-verified canonical completion gate
  -- has explicitly approved this exact canonical question.
  select count(*) into low_flag
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  where q.marks>0 and sp.source_url is not null and q.reviewed_at is null
    and (
      exists(select 1 from question_subtopics qs where qs.question_id=q.id and qs.is_primary and coalesce(qs.confidence,0)<0.72)
      or exists(select 1 from question_learning_objectives qlo where qlo.question_id=q.id and coalesce(qlo.confidence,0)<0.72)
    )
    and (q.status::text<>'needs_review' or coalesce(q.notes,'') not like '%taxonomy-review: low-confidence%')
    and not (
      q.status::text='approved'
      and coalesce(q.notes,'') like '%source-verified-corpus-completion-v1%'
      and coalesce(q.notes,'') like '%verified-canonical%'
    );

  -- A multi-mark scheme represented by one aggregate point is safe only when it
  -- is explicitly manual_only (current contract) or carries a legacy manual-*
  -- prompt marker. Anything decomposable must expose granular source points.
  select count(*) into c13_manual
  from mark_schemes ms
  join questions q on q.id=ms.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  join components c on c.id=q.component_id
  where q.marks>0 and sp.source_url is not null and c.number<=3 and ms.max_marks>1
    and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
    and ms.scheme_type<>'manual_only'::scheme_type
    and coalesce(ms.prompt_version,'') !~ '^manual-';

  select count(*) into c4_manual
  from mark_schemes ms
  join questions q on q.id=ms.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  join components c on c.id=q.component_id
  where q.marks>0 and sp.source_url is not null and c.number=4 and ms.max_marks>1
    and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
    and ms.scheme_type<>'manual_only'::scheme_type
    and coalesce(ms.prompt_version,'') !~ '^manual-practical';

  -- Deterministic rubric capacity and group semantics.
  select count(*) into bad_capacity
  from (
    select ms.id,ms.max_marks,
      coalesce((select sum(p.marks) from mark_scheme_points p where p.mark_scheme_id=ms.id and p.group_id is null),0)
      + coalesce((select sum(g.max_marks) from mark_scheme_groups g where g.mark_scheme_id=ms.id),0) capacity
    from mark_schemes ms
    join questions q on q.id=ms.question_id
    join source_papers sp on sp.id=q.source_paper_id
    join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
    where q.marks>0 and sp.source_url is not null
      and ms.scheme_type in ('all_required'::scheme_type,'any_n_from_m'::scheme_type)
  ) x where x.capacity<x.max_marks;

  select count(*) into bad_group
  from mark_scheme_groups g
  join mark_schemes ms on ms.id=g.mark_scheme_id
  join questions q on q.id=ms.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  where q.marks>0 and sp.source_url is not null
    and ms.scheme_type='any_n_from_m'::scheme_type
    and (
      not exists(select 1 from mark_scheme_points p where p.group_id=g.id)
      or (g.award_mode='fixed' and (
        (select count(*) from mark_scheme_points p where p.group_id=g.id)<g.n_required
        or g.max_marks<>g.n_required*g.marks_per_point
      ))
      or (g.award_mode='point_marks' and (select coalesce(max(p.marks),0) from mark_scheme_points p where p.group_id=g.id)>g.max_marks)
    );

  -- Mark-scheme point dependencies.
  select count(*) into missing_dep
  from mark_scheme_points p
  join mark_schemes ms on ms.id=p.mark_scheme_id
  join questions q on q.id=ms.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  cross join lateral jsonb_array_elements_text(coalesce(p.requires,'[]'::jsonb)) r(code)
  where q.marks>0 and sp.source_url is not null
    and not exists(
      select 1 from mark_scheme_points p2
      where p2.mark_scheme_id=p.mark_scheme_id and p2.code=r.code
    );

  select count(*) into self_dep
  from mark_scheme_points p
  join mark_schemes ms on ms.id=p.mark_scheme_id
  join questions q on q.id=ms.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  where q.marks>0 and sp.source_url is not null
    and p.code in (select value from jsonb_array_elements_text(coalesce(p.requires,'[]'::jsonb)));

  with recursive edges as (
    select p.mark_scheme_id,p.code src,r.value dst
    from mark_scheme_points p
    join mark_schemes ms on ms.id=p.mark_scheme_id
    join questions q on q.id=ms.question_id
    join source_papers sp on sp.id=q.source_paper_id
    join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
    cross join lateral jsonb_array_elements_text(coalesce(p.requires,'[]'::jsonb)) r(value)
    where q.marks>0 and sp.source_url is not null
  ), walk as (
    select e.mark_scheme_id,e.src start,e.dst node,array[e.src,e.dst]::text[] path from edges e
    union all
    select e.mark_scheme_id,w.start,e.dst,w.path||e.dst
    from walk w join edges e on e.mark_scheme_id=w.mark_scheme_id and e.src=w.node
    where not (e.dst=any(w.path))
  ), cyc as (
    select distinct w.mark_scheme_id,w.start from walk w
    join edges e on e.mark_scheme_id=w.mark_scheme_id and e.src=w.node
    where e.dst=any(w.path)
  )
  select count(*) into cycles from cyc;

  -- Question dependencies: strict blocking cases only. 2021-2025 is the historical
  -- source corpus governed by the deterministic dependency reconciler. Current 2026
  -- source verification is protected separately by the strict current-release gate.
  select count(*) into q_missing_answer
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  where sp.kind='QP'::paper_kind and sp.source_url is not null
    and sp.year between 2021 and 2025 and q.marks>0
    and q.stem_md ~* '((your|the) answer (to|from|for) part|use your answer (from|to|for) part|using your answer (from|to|for) part)'
    and not exists(
      select 1 from question_dependencies qd
      where qd.question_id=q.id and qd.kind='answer_ref' and qd.strength='required'
    );

  select count(*) into q_missing_practical
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  join components c on c.id=q.component_id
  where sp.kind='QP'::paper_kind and sp.source_url is not null
    and sp.year between 2021 and 2025 and c.number=4 and q.marks>0
    and q.stem_md ~* 'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
    and not exists(
      select 1 from question_dependencies qd
      where qd.question_id=q.id and qd.kind='answer_ref' and qd.strength='required'
    );

  select count(*) into q_cross
  from question_dependencies qd
  join questions q on q.id=qd.question_id
  join questions target on target.id=qd.depends_on_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  where sp.source_url is not null and sp.year between 2021 and 2025
    and q.source_paper_id<>target.source_paper_id;

  select count(*) into q_self
  from question_dependencies qd
  join questions q on q.id=qd.question_id
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
  where sp.source_url is not null and sp.year between 2021 and 2025
    and qd.question_id=qd.depends_on_id;

  with recursive q_edges as (
    select qd.question_id src,qd.depends_on_id dst,q.source_paper_id
    from question_dependencies qd
    join questions q on q.id=qd.question_id
    join source_papers sp on sp.id=q.source_paper_id
    join syllabi sy on sy.id=sp.syllabus_id and sy.code='9618'
    where sp.source_url is not null and sp.year between 2021 and 2025
  ), q_walk as (
    select e.source_paper_id,e.src start,e.dst node,array[e.src,e.dst]::uuid[] path from q_edges e
    union all
    select e.source_paper_id,w.start,e.dst,w.path||e.dst
    from q_walk w join q_edges e on e.source_paper_id=w.source_paper_id and e.src=w.node
    where not (e.dst=any(w.path))
  ), q_cyc as (
    select distinct w.source_paper_id,w.start from q_walk w
    join q_edges e on e.source_paper_id=w.source_paper_id and e.src=w.node
    where e.dst=any(w.path)
  )
  select count(*) into q_cycles from q_cyc;

  if structural<>0 or cross_sub<>0 or out_sub<>0 or cross_lo<>0 or out_lo<>0 or lo_owner<>0 or low_flag<>0
     or c13_manual<>0 or c4_manual<>0 or bad_capacity<>0 or bad_group<>0 or missing_dep<>0 or self_dep<>0 or cycles<>0
     or q_missing_answer<>0 or q_missing_practical<>0 or q_cross<>0 or q_self<>0 or q_cycles<>0 then
    raise exception '9618 corpus audit failed structural=% cross_sub=% out_sub=% cross_lo=% out_lo=% lo_owner=% low_flag=% c13_manual=% c4_manual=% capacity=% groups=% ms_missing_dep=% ms_self_dep=% ms_cycles=% q_missing_answer=% q_missing_practical=% q_cross=% q_self=% q_cycles=%',
      structural,cross_sub,out_sub,cross_lo,out_lo,lo_owner,low_flag,c13_manual,c4_manual,bad_capacity,bad_group,missing_dep,self_dep,cycles,
      q_missing_answer,q_missing_practical,q_cross,q_self,q_cycles;
  end if;
end $$;
