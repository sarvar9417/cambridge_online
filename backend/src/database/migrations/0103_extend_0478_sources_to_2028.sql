-- 0103_extend_0478_sources_to_2028.sql
-- Extend the source-staging window for the official 2026-2028 0478 syllabus.
-- Syllabus lookup remains the authoritative gate: a year cannot be staged
-- unless an exact 0478 syllabus version covering that year exists.

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
  if p_year < 2015 or p_year > 2028 then raise exception '0478_year_out_of_range:%',p_year; end if;
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

revoke all on function public.stage_0478_remote_source_v1(int,text,int,int,text,text,text,text,int) from public,anon,authenticated;
grant execute on function public.stage_0478_remote_source_v1(int,text,int,int,text,text,text,text,int) to service_role;
