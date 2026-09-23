-- 9618/22/M/J/21 mark-scheme visual-asset guard.
with expected(ms_id,page_no,kind) as (
 values
 ('7b3b610b-8dde-4dc6-b87a-0f40c70405b2'::uuid,3,'table'),
 ('29abbb4c-a517-4b56-b512-9b2ae0434188'::uuid,3,'table'),
 ('372b0dc0-4cfd-4096-8600-bdf2baf99efe'::uuid,3,'table'),
 ('8ba55138-0057-4568-8da5-b5ee91f88212'::uuid,3,'table'),
 ('e6e1cb4c-e8a9-4d6f-9a13-947daae77831'::uuid,5,'diagram'),
 ('f21f3eff-dd80-4a92-9330-084152e67092'::uuid,6,'table')
)
select e.ms_id,'vf_mj21_22_ms_visual_asset_missing' finding
from expected e
where not exists (
  select 1 from mark_scheme_assets msa
  where msa.mark_scheme_id=e.ms_id
    and msa.source_paper_id='223985ae-6e83-441b-ba05-ad60beeee025'::uuid
    and msa.source_sha256='bc9a3c2790d5805559b0f4e564da58acdb89bd08065a41e50edaaacf9720b785'
    and msa.source_page=e.page_no
    and msa.kind=e.kind
    and msa.content_md like '<svg%'
);