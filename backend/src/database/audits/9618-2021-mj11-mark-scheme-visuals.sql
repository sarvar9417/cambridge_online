-- 9618/11/M/J/21 mark-scheme visual regression guard.
-- Zero rows means every literally reviewed visual marking element is backed by
-- a SHA/page/bbox-pinned code asset.

with expected(mark_scheme_id,source_page,kind) as (
  values
    ('22d0d5d3-3f9e-43b1-a4b4-ab69ad53df49'::uuid,3,'code'::text),
    ('cfaf34de-f925-42eb-b66b-6c1d1977180c'::uuid,3,'code'::text),
    ('5d1afa9d-4362-46cc-ae6b-368a52826e0f'::uuid,5,'table'::text),
    ('be9c1c9f-55d0-4e91-ab2b-b9b80ae6c5ea'::uuid,6,'table'::text),
    ('aa513443-0b6c-4982-a747-ccbe8beb5d9e'::uuid,7,'table'::text),
    ('a864d07c-6179-4162-a9c1-74a8baf664c0'::uuid,9,'table'::text),
    ('b24b8d61-6d54-40ab-b452-93ff248073e1'::uuid,9,'code'::text),
    ('9e1e73e9-ce38-4316-8b5e-a370591a5c6a'::uuid,10,'table'::text)
)
select e.mark_scheme_id,e.source_page,e.kind,
       'ms11_source_visual_missing_or_unpinned'::text finding
from expected e
where not exists (
  select 1
  from mark_scheme_assets msa
  where msa.mark_scheme_id=e.mark_scheme_id
    and msa.source_paper_id='fa26b542-9ad7-4ebd-89a5-eab2d4695fc6'::uuid
    and msa.source_sha256='e0c2cd4128ec9e2491d8ef2befe7674281dd934cb366f72cbcc6ee026fef6733'
    and msa.source_page=e.source_page
    and msa.kind=e.kind
    and msa.content_md like '<svg%'
    and msa.source_bbox is not null
    and msa.structure_json is not null
    and msa.content_hash=encode(digest(msa.content_md,'sha256'),'hex')
);
