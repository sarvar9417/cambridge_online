-- Read-only blocking audit: every source-backed manual_only scheme must state why deterministic scoring is disabled.
do $$
declare missing_manual int;
begin
  select count(*) into missing_manual
  from mark_schemes ms
  join questions q on q.id=ms.question_id
  join source_papers sp on sp.id=q.source_paper_id
  where q.marks>0 and sp.source_url is not null
    and ms.scheme_type='manual_only'::scheme_type
    and coalesce(ms.prompt_version,'')!~'^manual-';
  if missing_manual<>0 then
    raise exception 'manual-only reason gate failure=%',missing_manual;
  end if;
end $$;
