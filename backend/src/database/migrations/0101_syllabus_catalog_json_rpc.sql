-- 0101_syllabus_catalog_json_rpc.sql
-- Small SECURITY DEFINER importer used by the OIDC corpus workflow. The repo
-- catalog remains the source of truth; this function only persists a validated
-- catalog shape into the existing syllabus schema.

create or replace function public.import_syllabus_catalog_json_v1(p_catalog jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_code text:=p_catalog->>'code';
  v_subject text:=p_catalog->>'subject';
  v_version text:=p_catalog->>'versionLabel';
  v_from int:=(p_catalog->>'validFrom')::int;
  v_to int:=(p_catalog->>'validTo')::int;
  v_active boolean:=coalesce((p_catalog->>'isActive')::boolean,false);
  v_syllabus uuid;
  v_existing_components int;
  v_existing_topics int;
  v_component jsonb;
  v_topic jsonb;
  v_sub jsonb;
  v_lo jsonb;
  v_num int;
  v_topic_id uuid;
  v_sub_id uuid;
  v_lo_id uuid;
  v_primary_component int;
  v_component_id uuid;
  v_level level_type;
  v_components int:=0;
  v_topics int:=0;
  v_subtopics int:=0;
  v_los int:=0;
  v_ct int:=0;
  v_clo int:=0;
begin
  if v_code not in ('9618','0478') then raise exception 'catalog_bad_code:%',v_code; end if;
  if coalesce(v_subject,'')='' or coalesce(v_version,'')='' or v_from<2015 or v_to<v_from then
    raise exception 'catalog_bad_metadata';
  end if;
  if jsonb_typeof(p_catalog->'components')<>'array' or jsonb_array_length(p_catalog->'components')=0
    or jsonb_typeof(p_catalog->'topics')<>'array' or jsonb_array_length(p_catalog->'topics')=0 then
    raise exception 'catalog_bad_shape';
  end if;
  if (v_code='0478' and jsonb_array_length(p_catalog->'components')<>2)
    or (v_code='9618' and jsonb_array_length(p_catalog->'components')<>4) then
    raise exception 'catalog_component_count_mismatch';
  end if;

  if exists(
    select 1 from syllabi s where s.code=v_code
      and not(s.valid_to<v_from or s.valid_from>v_to)
      and not(s.valid_from=v_from and s.valid_to=v_to)
  ) then raise exception 'catalog_validity_overlap:%:%-%',v_code,v_from,v_to; end if;

  select s.id into v_syllabus from syllabi s
  where s.code=v_code and s.valid_from=v_from and s.valid_to=v_to limit 1;
  if v_syllabus is not null then
    select count(*) into v_existing_components from components where syllabus_id=v_syllabus;
    select count(*) into v_existing_topics from topics where syllabus_id=v_syllabus;
    if v_existing_components>0 or v_existing_topics>0 then
      return jsonb_build_object('status','already_populated','syllabus_id',v_syllabus,
        'components',v_existing_components,'topics',v_existing_topics,
        'subtopics',(select count(*) from subtopics st join topics t on t.id=st.topic_id where t.syllabus_id=v_syllabus),
        'learning_objectives',(select count(*) from learning_objectives lo join subtopics st on st.id=lo.subtopic_id join topics t on t.id=st.topic_id where t.syllabus_id=v_syllabus));
    end if;
    update syllabi set subject=v_subject,version_label=v_version,is_active=v_active where id=v_syllabus;
  else
    insert into syllabi(code,subject,version_label,valid_from,valid_to,is_active)
    values(v_code,v_subject,v_version,v_from,v_to,v_active) returning id into v_syllabus;
  end if;

  for v_component in select value from jsonb_array_elements(p_catalog->'components') loop
    v_num:=(v_component->>'number')::int;
    if v_num<1 or v_num>4 then raise exception 'catalog_bad_component:%',v_num; end if;
    insert into components(syllabus_id,number,name,level,duration_min,total_marks,weight_pct)
    values(v_syllabus,v_num,v_component->>'name',(v_component->>'level')::level_type,
      (v_component->>'durationMinutes')::int,(v_component->>'totalMarks')::int,
      (v_component->>'weightingPct')::numeric);
    v_components:=v_components+1;
  end loop;

  for v_topic in select value from jsonb_array_elements(p_catalog->'topics') loop
    if jsonb_typeof(v_topic->'componentNumbers')<>'array' or jsonb_array_length(v_topic->'componentNumbers')=0 then
      raise exception 'catalog_topic_without_component:%',v_topic->>'number';
    end if;
    v_primary_component:=((v_topic->'componentNumbers')->>0)::int;
    select c.id,c.level into v_component_id,v_level from components c
      where c.syllabus_id=v_syllabus and c.number=v_primary_component;
    if v_component_id is null then raise exception 'catalog_unknown_component:%',v_primary_component; end if;
    insert into topics(syllabus_id,component_id,number,title,level,sort_order)
    values(v_syllabus,v_component_id,(v_topic->>'number')::int,v_topic->>'title',v_level,(v_topic->>'sortOrder')::int)
    returning id into v_topic_id;
    v_topics:=v_topics+1;

    for v_num in select value::text::int from jsonb_array_elements(v_topic->'componentNumbers') loop
      select c.id into v_component_id from components c where c.syllabus_id=v_syllabus and c.number=v_num;
      if v_component_id is null then raise exception 'catalog_unknown_component:%',v_num; end if;
      insert into component_topics(component_id,topic_id,is_primary)
      values(v_component_id,v_topic_id,v_num=v_primary_component);
      v_ct:=v_ct+1;
    end loop;

    for v_sub in select value from jsonb_array_elements(v_topic->'subtopics') loop
      insert into subtopics(topic_id,code,title,sort_order)
      values(v_topic_id,v_sub->>'code',v_sub->>'title',(v_sub->>'sortOrder')::int)
      returning id into v_sub_id;
      v_subtopics:=v_subtopics+1;

      for v_lo in select value from jsonb_array_elements(v_sub->'learningObjectives') loop
        insert into learning_objectives(subtopic_id,code,text,sort_order)
        values(v_sub_id,v_lo->>'code',v_lo->>'text',(v_lo->>'sortOrder')::int)
        returning id into v_lo_id;
        v_los:=v_los+1;

        if v_lo ? 'componentNumbers' then
          for v_num in select value::text::int from jsonb_array_elements(v_lo->'componentNumbers') loop
            select c.id into v_component_id from components c where c.syllabus_id=v_syllabus and c.number=v_num;
            if v_component_id is null then raise exception 'catalog_unknown_lo_component:%:%',v_lo->>'code',v_num; end if;
            insert into component_learning_objectives(component_id,learning_objective_id) values(v_component_id,v_lo_id);
            v_clo:=v_clo+1;
          end loop;
        else
          for v_num in select value::text::int from jsonb_array_elements(v_topic->'componentNumbers') loop
            select c.id into v_component_id from components c where c.syllabus_id=v_syllabus and c.number=v_num;
            insert into component_learning_objectives(component_id,learning_objective_id) values(v_component_id,v_lo_id);
            v_clo:=v_clo+1;
          end loop;
        end if;
      end loop;
    end loop;
  end loop;

  return jsonb_build_object('status','inserted','syllabus_id',v_syllabus,
    'components',v_components,'topics',v_topics,'component_topic_links',v_ct,
    'subtopics',v_subtopics,'learning_objectives',v_los,'component_lo_links',v_clo);
end
$$;
