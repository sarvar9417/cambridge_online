-- 9618/12/M/J/21 Q4 page-6 shared-context visual guard.
select qa.id asset_id,'vf_mj21_12_q4_context_regressed' finding
from question_assets qa
where qa.id='0159b3cf-5c56-4b91-abff-fd5bef63ba07'::uuid
and (
 qa.source_page is distinct from 6
 or qa.svg_markup is null
 or qa.svg_markup not like '%ASCII code table (selected codes only)%'
 or qa.latex_source is null
 or qa.latex_source not like '%\\textless address\\textgreater%'
 or qa.latex_source like '%Main memory%'
 or qa.size_bytes is distinct from octet_length(qa.svg_markup)
 or qa.content_hash is distinct from encode(digest(qa.svg_markup,'sha256'),'hex')
);