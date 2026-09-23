-- 9618/13/M/J/21 exact-source equivalence guard.
-- Paper 13 intentionally reuses canonical Paper 11 question/assets only when
-- every occurrence retains exact QP raster/text and MS equivalence evidence.
-- Zero rows means all 42 official occurrences remain source_verified_exact.

select
  qso.id occurrence_id,
  qso.display_ref,
  'vf_mj21_13_exact_equivalence_regressed'::text finding
from question_source_occurrences qso
where qso.source_paper_id='31e99020-8886-4391-9c61-1e535bf04bd5'::uuid
  and (
    qso.equivalence_basis is distinct from 'source_verified_exact'
    or coalesce((qso.evidence->>'sourceVerified')::boolean,false) is not true
    or coalesce((qso.evidence->>'qpBodyTextExact')::boolean,false) is not true
    or coalesce((qso.evidence->>'qpBodyRasterExact')::boolean,false) is not true
    or coalesce((qso.evidence->>'msExact')::boolean,false) is not true
    or qso.evidence->>'canonicalSourcePaperId' is distinct from 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'
    or qso.evidence->>'qpCanonicalFile' is distinct from '9618_s21_qp_11.pdf'
    or qso.evidence->>'qpSourceFile' is distinct from '9618_s21_qp_13.pdf'
  )
union all
select
  null::uuid,
  '9618/13/M/J/21',
  'vf_mj21_13_occurrence_count_regressed'
where (select count(*) from question_source_occurrences
       where source_paper_id='31e99020-8886-4391-9c61-1e535bf04bd5'::uuid) <> 42;