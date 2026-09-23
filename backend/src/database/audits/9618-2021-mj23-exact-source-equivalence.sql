-- 9618/23/M/J/21 exact-source equivalence guard.
-- Independent 180-DPI review in this execution compared the original Drive
-- QP23 with canonical QP21 and MS23 with MS21.
--
-- QP21 vs QP23:
--   * 24 pages vs 24 pages.
--   * Pages 2-24 differ only in the footer paper code.
--   * Each page 2-24 changed-pixel fraction = 0.00003605218953242225.
--   * Each page 2-24 diff bbox = [737,1997,747,2013].
--   * Question/visual body regions are pixel-identical at audited resolution.
--
-- MS21 vs MS23:
--   * 16 pages vs 16 pages.
--   * Page 1 diff is only component identifier material.
--   * Pages 2-16 differ only in the tiny top-left paper code.
--   * Typical pages 2-16 changed-pixel fraction = 0.000059980633912348515.
--   * Typical bbox = [209,58,223,79].
--   * Marking-body content is pixel-identical at audited resolution.
--
-- Therefore Paper 23 must inherit Paper 21 canonical question/asset repairs
-- and visual marking assets while exact-equivalence evidence remains intact.
-- Zero rows means the occurrence contract remains source-exact.

with occ as (
  select qso.*
  from question_source_occurrences qso
  where qso.source_paper_id='079f3e4f-6f33-4c94-9148-0f71136a1a55'::uuid
),
failures as (
  select
    o.id occurrence_id,
    o.display_ref,
    'vf_mj21_23_exact_equivalence_regressed'::text finding
  from occ o
  where o.equivalence_basis is distinct from 'source_verified_exact'
     or coalesce((o.evidence->>'sourceVerified')::boolean,false) is not true
     or coalesce((o.evidence->>'qpBodyTextExact')::boolean,false) is not true
     or coalesce((o.evidence->>'qpBodyRasterExact')::boolean,false) is not true
     or coalesce((o.evidence->>'msSourceSectionHashExact')::boolean,false) is not true
     or o.evidence->>'canonicalSourcePaperId'
        is distinct from 'f0350704-d7c2-4d3d-b3c9-c2c5e658565c'
     or o.evidence->>'qpCanonicalFile'
        is distinct from '9618_s21_qp_21.pdf'
     or o.evidence->>'qpSourceFile'
        is distinct from '9618_s21_qp_23.pdf'
     or o.mark_scheme_source_paper_id
        is distinct from '5a504a6b-b1cf-4db0-9e66-96ee02113e7e'::uuid
)
select * from failures
union all
select
  null::uuid,
  '9618/23/M/J/21',
  'vf_mj21_23_occurrence_count_regressed'
where (select count(*) from occ) <> 28
union all
select
  null::uuid,
  '9618/23/M/J/21',
  'vf_mj21_23_visual_asset_reuse_regressed'
where (
  select count(distinct qa.id)
  from occ o
  join question_assets qa on qa.question_id=o.question_id
) <> 12
union all
select
  null::uuid,
  '9618/23/M/J/21',
  'vf_mj21_23_ms_source_provenance_regressed'
where not exists (
  select 1
  from source_papers sp
  where sp.id='5a504a6b-b1cf-4db0-9e66-96ee02113e7e'::uuid
    and sp.kind='MS'
    and sp.sha256='5de878e74b3267ad5837dee6b1b3ec0d69abfca9426ca1246d915f327de3fa9e'
    and sp.page_count=16
);