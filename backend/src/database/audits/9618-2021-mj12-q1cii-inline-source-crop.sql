-- Q1(c)(ii) inline original-source crop precedence guard.
select qa.id asset_id,'vf_mj21_12_q1cii_inline_crop_regressed' finding
from question_assets qa
where qa.id='55a240b0-70e4-45ad-bfb7-047c55def1e0'::uuid
and (
  qa.source_page is distinct from 3
  or qa.crop_status is distinct from 'ready'
  or qa.storage_path is not null
  or qa.content_md is null
  or qa.svg_markup is distinct from qa.content_md
  or qa.svg_markup not like '<svg%<image href="data:image/png;base64,%'
  or qa.content_hash is distinct from encode(digest(qa.svg_markup,'sha256'),'hex')
);