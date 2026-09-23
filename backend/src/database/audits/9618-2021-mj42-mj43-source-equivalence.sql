-- 9618/42 and 9618/43 M/J/21 exact QP source-equivalence guard.
--
-- Independent execution evidence (180 DPI):
--   QP41 vs QP42 pages 2-12 differ only in footer paper identifier:
--     changed-pixel fraction 0.000034137913982028145,
--     bbox [736,1997,747,2012].
--   QP41 vs QP43 pages 2-12 differ only in footer paper identifier:
--     changed-pixel fraction 0.00003605218953242225,
--     bbox [737,1997,747,2013].
-- Therefore all question-body / visual regions are raster-identical.
--
-- MS41 vs MS42 and MS41 vs MS43 were also rendered independently at 180 DPI.
-- All 30 pages differ only in tiny paper-code/header identifier regions
-- (body content raster-equivalent), but production evidence currently has
-- msExact=false/absent. This audit deliberately does NOT rewrite or assert that
-- metadata; it only guards the source-specific MS links while the visual audit
-- retains the independent raster evidence.

with target(source_paper_id,expected_source_file,expected_ms_id) as (
 values
 ('39124081-393f-4011-916f-3d390c92c85f'::uuid,'9618_s21_qp_42.pdf','843e8046-5986-4d7b-b63c-eb88b873c502'::uuid),
 ('754025a5-b648-4379-a5e9-28e80b116319'::uuid,'9618_s21_qp_43.pdf','83b533a0-4aeb-4e82-87e4-756a491d88dd'::uuid)
)
select qso.id occurrence_id,qso.display_ref,'vf_mj21_42_43_qp_exact_equivalence_regressed' finding
from target t
join question_source_occurrences qso on qso.source_paper_id=t.source_paper_id
where qso.equivalence_basis is distinct from 'source_verified_exact'
   or coalesce((qso.evidence->>'sourceVerified')::boolean,false) is not true
   or coalesce((qso.evidence->>'qpBodyTextExact')::boolean,false) is not true
   or coalesce((qso.evidence->>'qpBodyRasterExact')::boolean,false) is not true
   or qso.evidence->>'canonicalSourcePaperId' is distinct from '874721d6-6c9a-4009-a192-c58b7aeef7a7'
   or qso.evidence->>'qpCanonicalFile' is distinct from '9618_s21_qp_41.pdf'
   or qso.evidence->>'qpSourceFile' is distinct from t.expected_source_file
   or qso.mark_scheme_source_paper_id is distinct from t.expected_ms_id
union all
select null::uuid,'9618/42/M/J/21','vf_mj21_42_occurrence_count_regressed'
where (select count(*) from question_source_occurrences
       where source_paper_id='39124081-393f-4011-916f-3d390c92c85f'::uuid) <> 26
union all
select null::uuid,'9618/43/M/J/21','vf_mj21_43_occurrence_count_regressed'
where (select count(*) from question_source_occurrences
       where source_paper_id='754025a5-b648-4379-a5e9-28e80b116319'::uuid) <> 26;