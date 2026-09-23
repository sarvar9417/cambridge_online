-- 9618/31/M/J/21 mark-scheme visual fidelity guard.
select msa.id asset_id,q.display_ref,'vf_mj21_31_ms_visual_regressed' finding
from mark_scheme_assets msa
join mark_schemes ms on ms.id=msa.mark_scheme_id
join questions q on q.id=ms.question_id
where msa.source_paper_id='25b182e2-b612-4e8c-949b-2fad77466bd5'::uuid
  and (
    msa.source_sha256 is distinct from 'f57eefd05c458fb8f85885f1ac88e9ec41c366e0795e9b2406bcee18d787cd13'
    or msa.source_bbox is null
    or msa.source_bbox='[0, 0, 1, 1]'::jsonb
    or msa.content_md is null
    or msa.content_md not like '<svg%'
    or msa.content_hash is distinct from encode(digest(msa.content_md,'sha256'),'hex')
  )
union all
select null::uuid,'9618/31/M/J/21','vf_mj21_31_ms_visual_count_regressed'
where (
 select count(*) from mark_scheme_assets
 where source_paper_id='25b182e2-b612-4e8c-949b-2fad77466bd5'::uuid
   and source_sha256='f57eefd05c458fb8f85885f1ac88e9ec41c366e0795e9b2406bcee18d787cd13'
) < 8;