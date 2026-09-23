-- 9618/32 and 9618/33 M/J/21 source-equivalence guard.
--
-- QP evidence:
--   Both papers are exact question-body occurrences of canonical 9618/31/M/J/21.
--   Every occurrence must retain source_verified_exact, exact body text and exact
--   body raster evidence, pointing to the 31 canonical QP.
--
-- MS evidence is deliberately NOT asserted as exact here:
--   independent 180-DPI review found 9618/33 marking-body raster equivalent to
--   9618/31 apart from paper identifiers, while 9618/32 page 10 has a real
--   header-alignment difference in the Q9(c) answer table. Therefore this guard
--   does not convert MS32/MS33 to msExact or visual PASS.

with target(source_paper_id,expected_source_file) as (
 values
 ('8b680079-c310-408a-bd26-8c5b3c44f21a'::uuid,'9618_s21_qp_32.pdf'),
 ('5c5d58cd-9297-4946-9730-c6ae122ef637'::uuid,'9618_s21_qp_33.pdf')
)
select qso.id occurrence_id,qso.display_ref,'vf_mj21_32_33_qp_exact_equivalence_regressed' finding
from target t
join question_source_occurrences qso on qso.source_paper_id=t.source_paper_id
where qso.equivalence_basis is distinct from 'source_verified_exact'
   or coalesce((qso.evidence->>'sourceVerified')::boolean,false) is not true
   or coalesce((qso.evidence->>'qpBodyTextExact')::boolean,false) is not true
   or coalesce((qso.evidence->>'qpBodyRasterExact')::boolean,false) is not true
   or qso.evidence->>'canonicalSourcePaperId' is distinct from '5861419d-e79b-4eb2-8070-d72fb07f62cb'
   or qso.evidence->>'qpCanonicalFile' is distinct from '9618_s21_qp_31.pdf'
   or qso.evidence->>'qpSourceFile' is distinct from t.expected_source_file
union all
select null::uuid,'9618/32/M/J/21','vf_mj21_32_occurrence_count_regressed'
where (select count(*) from question_source_occurrences where source_paper_id='8b680079-c310-408a-bd26-8c5b3c44f21a'::uuid) <> 38
union all
select null::uuid,'9618/33/M/J/21','vf_mj21_33_occurrence_count_regressed'
where (select count(*) from question_source_occurrences where source_paper_id='5c5d58cd-9297-4946-9730-c6ae122ef637'::uuid) <> 38
union all
select null::uuid,'9618/32/M/J/21','vf_mj21_32_ms_source_link_regressed'
where (select count(*) from question_source_occurrences where mark_scheme_source_paper_id='f0d03481-8f41-49f0-966c-6c865084dce0'::uuid) <> 38
union all
select null::uuid,'9618/33/M/J/21','vf_mj21_33_ms_source_link_regressed'
where (select count(*) from question_source_occurrences where mark_scheme_source_paper_id='e5a7f098-95a8-4598-9db6-55bff222748d'::uuid) <> 38;