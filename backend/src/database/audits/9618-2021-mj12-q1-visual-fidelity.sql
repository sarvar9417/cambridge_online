-- 9618/12/M/J/21 Q1(a)/(b) visual fidelity regression guard.
select qa.id asset_id,q.display_ref,'vf_mj21_12_q1_visual_regressed' finding
from question_assets qa join questions q on q.id=qa.question_id
where qa.id in (
 '216e9449-f087-4ca7-aaf4-1296a0dcbcfa'::uuid,
 '49a0cd3f-ef9a-48d8-b8da-581683cf4574'::uuid
)
and (
 qa.source_page is distinct from 2
 or qa.svg_markup is null
 or qa.size_bytes is distinct from octet_length(qa.svg_markup)
 or qa.content_hash is distinct from encode(digest(qa.svg_markup,'sha256'),'hex')
 or (qa.id='216e9449-f087-4ca7-aaf4-1296a0dcbcfa'::uuid
     and (qa.svg_markup not like '%stroke-dasharray%' or qa.latex_source not like '%\\dotfill%'))
 or (qa.id='49a0cd3f-ef9a-48d8-b8da-581683cf4574'::uuid
     and qa.svg_markup not like '%viewBox="0 0 292 111"%')
);