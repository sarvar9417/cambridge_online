-- 0102_lock_0478_corpus_rpcs.sql
revoke all on function public.corpus_runner_bootstrap_v2(text,int,int) from public,anon,authenticated;
revoke all on function public.stage_0478_remote_source_v1(int,text,int,int,text,text,text,text,int) from public,anon,authenticated;
revoke all on function public.ingest_source_backfill_paper_v3(uuid,uuid,jsonb,text) from public,anon,authenticated;
revoke all on function public.import_syllabus_catalog_json_v1(jsonb) from public,anon,authenticated;

grant execute on function public.corpus_runner_bootstrap_v2(text,int,int) to service_role;
grant execute on function public.stage_0478_remote_source_v1(int,text,int,int,text,text,text,text,int) to service_role;
grant execute on function public.ingest_source_backfill_paper_v3(uuid,uuid,jsonb,text) to service_role;
grant execute on function public.import_syllabus_catalog_json_v1(jsonb) to service_role;
