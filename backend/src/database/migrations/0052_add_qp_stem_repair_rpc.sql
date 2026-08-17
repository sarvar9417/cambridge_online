-- Transactional/idempotent repair for source-backed Question Paper stems.
-- This intentionally touches question text only: mark schemes, taxonomy bindings,
-- answers and grading evidence are not modified.

create or replace function public.repair_qp_stems_v1(
  p_qp_id uuid,
  p_rows jsonb,
  p_prompt text default 'source-backed-qp-stem-repair-v1'
) returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_qp source_papers%rowtype;
  v_row jsonb;
  v_qid uuid;
  v_expected_rows integer;
  v_expected_marks integer;
  v_rows integer;
  v_marks integer;
  v_updated integer := 0;
begin
  select * into v_qp
  from source_papers
  where id=p_qp_id and kind='QP'::paper_kind
  for update;
  if not found then raise exception 'qp_not_found'; end if;

  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 then
    raise exception 'empty_rows';
  end if;

  select count(*),coalesce(sum(q.marks),0)
    into v_expected_rows,v_expected_marks
  from questions q
  where q.source_paper_id=p_qp_id and q.marks>0;

  select count(*),coalesce(sum((x->>'marks')::integer),0)
    into v_rows,v_marks
  from jsonb_array_elements(p_rows) x;

  if v_rows<>v_expected_rows then
    raise exception 'qp_stem_leaf_count_mismatch:%:%',v_rows,v_expected_rows;
  end if;
  if v_marks<>v_expected_marks then
    raise exception 'qp_stem_mark_sum_mismatch:%:%',v_marks,v_expected_marks;
  end if;
  if exists(
    select 1 from (
      select x->>'path' path,count(*) n
      from jsonb_array_elements(p_rows) x
      group by 1 having count(*)>1
    ) d
  ) then raise exception 'duplicate_qp_stem_path'; end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    if nullif(trim(coalesce(v_row->>'stem','')),'') is null then
      raise exception 'empty_qp_stem:%',v_row->>'path';
    end if;

    select q.id into v_qid
    from questions q
    where q.source_paper_id=p_qp_id
      and q.path=v_row->>'path'
      and q.marks=(v_row->>'marks')::integer;
    if v_qid is null then
      raise exception 'qp_stem_path_or_mark_mismatch:%',v_row->>'path';
    end if;

    update questions
    set stem_md=v_row->>'stem',
        prompt_version=p_prompt,
        extract_confidence=greatest(coalesce(extract_confidence,0),0.99),
        updated_at=now()
    where id=v_qid
      and nullif(trim(coalesce(stem_md,'')),'') is null;
    if found then v_updated:=v_updated+1; end if;
  end loop;

  if exists(
    select 1 from questions q
    where q.source_paper_id=p_qp_id and q.marks>0
      and nullif(trim(coalesce(q.stem_md,'')),'') is null
  ) then raise exception 'qp_stem_post_gate_failed'; end if;

  return jsonb_build_object(
    'paper_id',p_qp_id,
    'leaves',v_expected_rows,
    'marks',v_expected_marks,
    'updated',v_updated
  );
end $$;

revoke all on function public.repair_qp_stems_v1(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.repair_qp_stems_v1(uuid,jsonb,text) to service_role;
