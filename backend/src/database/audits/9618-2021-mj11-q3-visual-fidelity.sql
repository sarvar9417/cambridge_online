-- VF-E-000001 regression guard.
-- Zero rows means the Q3 source-required table has a code-based representation
-- with literal angle brackets and the final Cambridge footnote content.

select
  qa.id as asset_id,
  q.display_ref,
  'vf_e_000001_instruction_table_representation_regressed'::text as finding
from question_assets qa
join questions q on q.id=qa.question_id
where qa.id='f9483ad1-7672-4b18-bd0c-cb6b21507950'::uuid
  and (
    qa.source_page is distinct from 7
    or qa.svg_markup is null
    or qa.svg_markup not like '%&lt;address&gt;%'
    or qa.svg_markup not like '%# denotes a denary number, e.g. #123%'
    or qa.latex_source is null
    or qa.latex_source not like '%\\textless address\\textgreater%'
    or qa.size_bytes is distinct from octet_length(qa.svg_markup)
    or qa.content_hash is distinct from encode(digest(qa.svg_markup,'sha256'),'hex')
  );
