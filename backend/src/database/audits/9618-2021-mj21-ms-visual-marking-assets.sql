-- 9618/21/M/J/21 mark-scheme visual-asset guard.
with expected(ms_id,page_no,kind) as (
 values
 ('67985a95-d63c-405b-a519-640af7c7ab9d'::uuid,3,'table'),
 ('9a05c622-40ed-4165-aeaa-700af250fc99'::uuid,3,'table'),
 ('4636b2f1-686f-4b21-99da-3ea18330b742'::uuid,5,'diagram'),
 ('1e286fe9-3795-4b13-9181-16b62dec096a'::uuid,9,'table')
)
select e.ms_id,'vf_mj21_21_ms_visual_asset_missing' finding
from expected e
where not exists (
  select 1 from mark_scheme_assets msa
  where msa.mark_scheme_id=e.ms_id
    and msa.source_paper_id='d64155a4-675c-4b44-bf92-5c4620503409'::uuid
    and msa.source_sha256='20eafcac995fc5513988c5dc282e530135a3b5b021bdd14c6d2066b825ff019b'
    and msa.source_page=e.page_no
    and msa.kind=e.kind
    and msa.content_md like '<svg%'
);