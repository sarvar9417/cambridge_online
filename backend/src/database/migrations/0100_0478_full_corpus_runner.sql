-- 0100_0478_full_corpus_runner.sql
-- Production-safe helpers for bringing the full 0478 QP/MS corpus through the
-- same source-backed pipeline used by 9618 without changing the legacy 9618
-- runner contracts.

create or replace function public.corpus_runner_bootstrap_v2(
  p_syllabus_code text,
  p_year_from int,
  p_year_to int
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_sources jsonb;
  v_train_sub jsonb;
  v_train_lo jsonb;
  v_coverage jsonb;
begin
  if p_syllabus_code not in ('9618','0478') then
    raise exception 'unsupported_syllabus:%',p_syllabus_code;
  end if;
  if p_year_from < 2015 or p_year_to < p_year_from or p_year_to > 2035 then
    raise exception 'invalid_year_window:%-%',p_year_from,p_year_to;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'qp_id',q.id,'ms_id',m.id,'year',q.year,'series',q.series::text,
    'component',c.number,'variant',q.variant,'qp_url',q.source_url,
    'ms_url',m.source_url,'syllabus_id',q.syllabus_id,'component_id',q.component_id,
    'expected_marks',c.total_marks,'version_label',s.version_label
  ) order by q.year,q.series,c.number,q.variant),'[]'::jsonb)
  into v_sources
  from source_papers q
  join syllabi s on s.id=q.syllabus_id and s.code=p_syllabus_code
  join components c on c.id=q.component_id
  join source_papers m on m.kind='MS' and m.syllabus_id=q.syllabus_id
    and m.component_id=q.component_id and m.year=q.year
    and m.series=q.series and m.variant=q.variant
  where q.kind='QP' and q.year between p_year_from and p_year_to
    and q.source_url is not null and m.source_url is not null
    and not exists(select 1 from questions x where x.source_paper_id=q.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'syllabus_id',sp.syllabus_id,'component',c.number,'path',q.path,
    'stem',left(coalesce(q.stem_md,''),1600),
    'guidance',left(coalesce(ms.guidance_md,''),1200),'subtopic',st.code
  )),'[]'::jsonb)
  into v_train_sub
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi s on s.id=sp.syllabus_id and s.code=p_syllabus_code
  join components c on c.id=q.component_id
  join question_subtopics qs on qs.question_id=q.id and qs.is_primary
  join subtopics st on st.id=qs.subtopic_id
  left join mark_schemes ms on ms.question_id=q.id
  where q.marks>0 and sp.year between p_year_from and p_year_to;

  select coalesce(jsonb_agg(jsonb_build_object(
    'syllabus_id',sp.syllabus_id,'component',c.number,'subtopic',st.code,
    'path',q.path,'stem',left(coalesce(q.stem_md,''),1600),
    'guidance',left(coalesce(ms.guidance_md,''),1200),'lo',lo.code
  )),'[]'::jsonb)
  into v_train_lo
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  join syllabi s on s.id=sp.syllabus_id and s.code=p_syllabus_code
  join components c on c.id=q.component_id
  join question_subtopics qs on qs.question_id=q.id and qs.is_primary
  join subtopics st on st.id=qs.subtopic_id
  join question_learning_objectives qlo on qlo.question_id=q.id
  join learning_objectives lo on lo.id=qlo.lo_id
  left join mark_schemes ms on ms.question_id=q.id
  where q.marks>0 and sp.year between p_year_from and p_year_to;

  select coalesce(jsonb_agg(x.obj order by x.valid_from,x.component),'[]'::jsonb)
  into v_coverage
  from (
    select s.valid_from,c.number component,jsonb_build_object(
      'syllabus_id',s.id,'version',s.version_label,'valid_from',s.valid_from,
      'valid_to',s.valid_to,'component_id',c.id,'component',c.number,
      'expected_marks',c.total_marks,
      'subtopics',coalesce((
        select jsonb_agg(jsonb_build_object('code',st.code,'title',st.title) order by st.sort_order,st.code)
        from component_topics ct
        join topics tp2 on tp2.id=ct.topic_id
        join subtopics st on st.topic_id=tp2.id
        where ct.component_id=c.id
      ),'[]'::jsonb),
      'los',coalesce((
        select jsonb_agg(jsonb_build_object('subtopic',st.code,'code',lo.code,'text',lo.text)
          order by st.sort_order,lo.sort_order,lo.code)
        from component_learning_objectives cl
        join learning_objectives lo on lo.id=cl.learning_objective_id
        join subtopics st on st.id=lo.subtopic_id
        where cl.component_id=c.id
      ),'[]'::jsonb)
    ) obj
    from syllabi s
    join components c on c.syllabus_id=s.id
    where s.code=p_syllabus_code
      and not(s.valid_to<p_year_from or s.valid_from>p_year_to)
  ) x;

  return jsonb_build_object(
    'syllabus_code',p_syllabus_code,'year_from',p_year_from,'year_to',p_year_to,
    'sources',v_sources,'training_subtopics',v_train_sub,
    'training_los',v_train_lo,'coverage',v_coverage
  );
end
$$;

create or replace function public.stage_0478_remote_source_v1(
  p_year int,
  p_series text,
  p_component int,
  p_variant int,
  p_kind text,
  p_filename text,
  p_source_url text,
  p_sha256 text,
  p_page_count int default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_syllabus uuid;
  v_component uuid;
  v_id uuid;
  v_expected_name text;
  v_letter text;
  v_kind text;
begin
  if p_year < 2015 or p_year > 2025 then raise exception '0478_year_out_of_range:%',p_year; end if;
  if p_series not in ('FM','MJ','ON') then raise exception '0478_bad_series:%',p_series; end if;
  if p_component not in (1,2) or p_variant not in (1,2,3) then
    raise exception '0478_bad_paper:%/%',p_component,p_variant;
  end if;
  v_kind:=upper(p_kind);
  if v_kind not in ('QP','MS') then raise exception '0478_bad_kind:%',p_kind; end if;
  if p_source_url is null or p_source_url !~ '^https://drive\.google\.com/' then
    raise exception '0478_bad_source_url';
  end if;
  if lower(coalesce(p_sha256,'')) !~ '^[0-9a-f]{64}$' then raise exception '0478_bad_sha256'; end if;

  v_letter:=case p_series when 'FM' then 'm' when 'MJ' then 's' else 'w' end;
  v_expected_name:=format('0478_%s%s_%s_%s%s.pdf',v_letter,right(p_year::text,2),lower(v_kind),p_component,p_variant);
  if lower(p_filename)<>v_expected_name then
    raise exception '0478_filename_metadata_mismatch:%!=%',p_filename,v_expected_name;
  end if;

  select s.id into v_syllabus
  from syllabi s
  where s.code='0478' and p_year between s.valid_from and s.valid_to
  order by s.valid_from desc limit 1;
  if v_syllabus is null then raise exception '0478_syllabus_version_missing:%',p_year; end if;

  select c.id into v_component
  from components c where c.syllabus_id=v_syllabus and c.number=p_component;
  if v_component is null then raise exception '0478_component_missing:%:%',p_year,p_component; end if;

  insert into source_papers(
    syllabus_id,component_id,year,series,variant,kind,storage_path,sha256,page_count,source_url
  ) values(
    v_syllabus,v_component,p_year,p_series::exam_series,p_variant,v_kind::paper_kind,
    format('remote/0478/%s/%s/%s',p_year,p_series,v_expected_name),lower(p_sha256),p_page_count,p_source_url
  )
  on conflict(syllabus_id,component_id,year,series,variant,kind)
  do update set storage_path=excluded.storage_path,sha256=excluded.sha256,
    page_count=coalesce(excluded.page_count,source_papers.page_count),source_url=excluded.source_url
  returning id into v_id;

  return jsonb_build_object('id',v_id,'year',p_year,'series',p_series,
    'component',p_component,'variant',p_variant,'kind',v_kind,
    'filename',v_expected_name,'sha256',lower(p_sha256));
end
$$;

create or replace function public.ingest_source_backfill_paper_v3(
  p_qp_id uuid,
  p_ms_id uuid,
  p_rows jsonb,
  p_prompt text default 'source-backed-0478-oidc-v1'
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_qp source_papers%rowtype;
  v_row jsonb;
  v_path text;
  v_prefix text;
  v_parts text[];
  v_i int;
  v_qid uuid;
  v_parent uuid;
  v_stid uuid;
  v_loid uuid;
  v_nodes int;
  v_leaves int;
  v_marks int;
  v_schemes int;
  v_primary int;
  v_lo_count int;
  v_expected_marks int;
  v_syllabus_code text;
  v_paper_code text;
  v_series_label text;
  v_year_short text;
  v_display_path text;
  v_display_ref text;
begin
  select sp.* into v_qp from source_papers sp where sp.id=p_qp_id and sp.kind='QP' for update;
  if not found then raise exception 'qp_not_found'; end if;
  if not exists(
    select 1 from source_papers m where m.id=p_ms_id and m.kind='MS'
      and m.syllabus_id=v_qp.syllabus_id and m.component_id=v_qp.component_id
      and m.year=v_qp.year and m.series=v_qp.series and m.variant=v_qp.variant
  ) then raise exception 'ms_pair_mismatch'; end if;
  if exists(select 1 from questions where source_paper_id=p_qp_id) then raise exception 'paper_already_ingested'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 then raise exception 'empty_rows'; end if;

  select c.total_marks,s.code,c.number::text||v_qp.variant::text,
    case v_qp.series when 'FM'::exam_series then 'F/M' when 'MJ'::exam_series then 'M/J' else 'O/N' end,
    right(v_qp.year::text,2)
  into v_expected_marks,v_syllabus_code,v_paper_code,v_series_label,v_year_short
  from components c join syllabi s on s.id=c.syllabus_id
  where c.id=v_qp.component_id;
  if v_expected_marks is null then raise exception 'component_marks_missing'; end if;

  select count(*),coalesce(sum((x->>'marks')::int),0)
  into v_leaves,v_marks from jsonb_array_elements(p_rows) x;
  if v_marks<>v_expected_marks then
    raise exception 'paper_marks_mismatch:% expected %',v_marks,v_expected_marks;
  end if;
  if exists(select 1 from (select x->>'path' p,count(*) c from jsonb_array_elements(p_rows) x group by 1 having count(*)>1)d) then
    raise exception 'duplicate_leaf_path';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    if nullif(v_row->>'path','') is null or (v_row->>'marks') is null
      or nullif(v_row->>'stem','') is null or nullif(v_row->>'subtopic','') is null
      or nullif(v_row->>'lo','') is null then
      raise exception 'row_missing_required:%',v_row;
    end if;
    select st.id into v_stid
    from subtopics st
    join topics t on t.id=st.topic_id
    join component_topics ct on ct.topic_id=t.id and ct.component_id=v_qp.component_id
    where t.syllabus_id=v_qp.syllabus_id and st.code=v_row->>'subtopic' limit 1;
    if v_stid is null then raise exception 'invalid_subtopic:%:%',v_row->>'path',v_row->>'subtopic'; end if;
    select lo.id into v_loid
    from learning_objectives lo
    join component_learning_objectives clo on clo.learning_objective_id=lo.id and clo.component_id=v_qp.component_id
    where lo.subtopic_id=v_stid and lo.code=v_row->>'lo' limit 1;
    if v_loid is null then raise exception 'invalid_lo:%:%',v_row->>'path',v_row->>'lo'; end if;
  end loop;

  create temporary table if not exists _backfill_nodes(path text primary key,sort_order int) on commit drop;
  truncate _backfill_nodes;
  v_i:=0;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_i:=v_i+1;v_path:=v_row->>'path';v_parts:=string_to_array(v_path,'.');
    for j in 1..array_length(v_parts,1) loop
      v_prefix:=array_to_string(v_parts[1:j],'.');
      insert into _backfill_nodes(path,sort_order) values(v_prefix,v_i)
      on conflict(path) do update set sort_order=least(_backfill_nodes.sort_order,excluded.sort_order);
    end loop;
  end loop;

  for v_path,v_i in select path,sort_order from _backfill_nodes
    order by array_length(string_to_array(path,'.'),1),sort_order,path
  loop
    v_parts:=string_to_array(v_path,'.');v_parent:=null;
    if array_length(v_parts,1)>1 then
      v_prefix:=array_to_string(v_parts[1:array_length(v_parts,1)-1],'.');
      select id into v_parent from questions where source_paper_id=p_qp_id and path=v_prefix;
    end if;
    select value into v_row from jsonb_array_elements(p_rows) where value->>'path'=v_path limit 1;
    v_display_path:='Q'||v_parts[1];
    if array_length(v_parts,1)>1 then
      for j in 2..array_length(v_parts,1) loop v_display_path:=v_display_path||'('||v_parts[j]||')'; end loop;
    end if;
    v_display_ref:=format('%s/%s/%s/%s %s',v_syllabus_code,v_paper_code,v_series_label,v_year_short,v_display_path);

    insert into questions(
      source_paper_id,component_id,parent_id,label,path,display_ref,depth,sort_order,
      stem_md,marks,answer_kind,status,extract_confidence,prompt_version,notes
    ) values(
      p_qp_id,v_qp.component_id,v_parent,v_parts[array_length(v_parts,1)],v_path,v_display_ref,
      array_length(v_parts,1)-1,v_i,
      case when v_row is null then null else v_row->>'stem' end,
      case when v_row is null then null else (v_row->>'marks')::int end,
      case when v_row is null then 'text'::answer_kind else coalesce(nullif(v_row->>'answer_kind',''),'text')::answer_kind end,
      case when v_row is null then 'approved'::review_status
        when coalesce((v_row->>'confidence')::numeric,0)>=0.72 then 'approved'::review_status
        else 'needs_review'::review_status end,
      case when v_row is null then null else coalesce((v_row->>'confidence')::numeric,0) end,
      p_prompt,
      case when v_row is null then null else jsonb_build_object(
        'taxonomy_method',coalesce(v_row->>'method','semantic'),
        'taxonomy_confidence',coalesce((v_row->>'confidence')::numeric,0),
        'source_fidelity','source-backed'
      )::text end
    ) returning id into v_qid;
  end loop;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_path:=v_row->>'path';
    select q.id into v_qid from questions q where q.source_paper_id=p_qp_id and q.path=v_path;
    select st.id into v_stid
    from subtopics st join topics t on t.id=st.topic_id
    join component_topics ct on ct.topic_id=t.id and ct.component_id=v_qp.component_id
    where t.syllabus_id=v_qp.syllabus_id and st.code=v_row->>'subtopic' limit 1;
    select lo.id into v_loid
    from learning_objectives lo
    join component_learning_objectives clo on clo.learning_objective_id=lo.id and clo.component_id=v_qp.component_id
    where lo.subtopic_id=v_stid and lo.code=v_row->>'lo' limit 1;

    insert into question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by)
    values(v_qid,v_stid,true,1,coalesce((v_row->>'confidence')::numeric,.60),'source-backed-0478');
    insert into question_learning_objectives(question_id,lo_id,confidence)
    values(v_qid,v_loid,coalesce((v_row->>'lo_confidence')::numeric,.55));
    insert into mark_schemes(
      question_id,source_paper_id,scheme_type,max_marks,guidance_md,status,extract_confidence,prompt_version
    ) values(
      v_qid,p_ms_id,'manual_only',(v_row->>'marks')::int,v_row->>'guidance','approved',.97,p_prompt
    );
  end loop;

  insert into mark_scheme_points(mark_scheme_id,code,text,marks,sort_order)
  select ms.id,'M1',coalesce(ms.guidance_md,'See official mark scheme'),ms.max_marks,1
  from mark_schemes ms join questions q on q.id=ms.question_id
  where q.source_paper_id=p_qp_id
  on conflict(mark_scheme_id,code) do nothing;

  select count(*),count(*) filter(where marks is not null),
    coalesce(sum(marks) filter(where marks is not null),0)
  into v_nodes,v_leaves,v_marks from questions where source_paper_id=p_qp_id;
  select count(*) into v_schemes from mark_schemes ms join questions q on q.id=ms.question_id where q.source_paper_id=p_qp_id;
  select count(*) into v_primary from questions q where q.source_paper_id=p_qp_id and q.marks is not null
    and (select count(*) from question_subtopics qs where qs.question_id=q.id and qs.is_primary)=1;
  select count(distinct qlo.question_id) into v_lo_count
    from question_learning_objectives qlo join questions q on q.id=qlo.question_id
    where q.source_paper_id=p_qp_id and q.marks is not null;

  if v_marks<>v_expected_marks or v_schemes<>v_leaves or v_primary<>v_leaves or v_lo_count<>v_leaves then
    raise exception 'post_insert_gate_failed:nodes=%,leaves=%,marks=%/%,schemes=%,primary=%,lo=%',
      v_nodes,v_leaves,v_marks,v_expected_marks,v_schemes,v_primary,v_lo_count;
  end if;

  return jsonb_build_object('nodes',v_nodes,'leaves',v_leaves,'marks',v_marks,
    'expected_marks',v_expected_marks,'schemes',v_schemes,'primary',v_primary,'lo_count',v_lo_count);
end
$$;
