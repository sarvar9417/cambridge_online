-- VF-E-000001 regression guard.
-- Zero rows means the canonical 0195 SVG remains source-pinned and the 0199
-- LaTeX fallback keeps literal Cambridge angle-bracket operands.

select
  qa.id as asset_id,
  q.display_ref,
  'vf_e_000001_instruction_table_representation_regressed'::text as finding
from question_assets qa
join questions q on q.id=qa.question_id
where qa.id='f9483ad1-7672-4b18-bd0c-cb6b21507950'::uuid
  and (
    q.id is distinct from '6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'::uuid
    or qa.source_page is distinct from 7
    or qa.source_bbox is distinct from '[89,286,1565,1549]'::jsonb
    or qa.content_hash is distinct from '3eb93fb3af37767404486d5f5188fef371cdb870f886d6f12eb7bf39a116fef3'
    or qa.svg_markup is null
    or qa.svg_markup not like '%&lt;address&gt;%'
    or qa.svg_markup not like '%# denotes a denary number, e.g. #123%'
    or qa.latex_source is null
    or qa.latex_source not like '%\\textless address\\textgreater%'
    or qa.latex_source not like '%\\textless register\\textgreater%'
  );
