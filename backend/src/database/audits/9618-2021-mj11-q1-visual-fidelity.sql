-- VF-E-000004 regression guard for 9618/11/M/J/21 Q1(a)(i).
-- Zero rows means the source answer table still preserves Cambridge's two
-- large response rows and six dotted writing lines in code-based form.

select
  qa.id as asset_id,
  q.display_ref,
  'vf_e_000004_q1_answer_table_regressed'::text as finding
from question_assets qa
join questions q on q.id=qa.question_id
join source_papers sp on sp.id=q.source_paper_id
where qa.id='ac6a3282-23d5-462b-8212-191ce792db64'::uuid
  and (
    q.id is distinct from '5b3a6893-9dd0-49cf-832b-517716b46524'::uuid
    or q.path is distinct from '1.a.i'
    or sp.id is distinct from 'fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid
    or sp.sha256 is distinct from 'd73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453'
    or qa.source_page is distinct from 2
    or qa.svg_markup is null
    or qa.svg_markup not like '%stroke-dasharray%'
    or qa.svg_markup not like '%File header%'
    or qa.latex_source is null
    or qa.latex_source not like '%\\dotfill%'
    or qa.size_bytes is distinct from octet_length(qa.svg_markup)
    or qa.content_hash is distinct from encode(digest(qa.svg_markup,'sha256'),'hex')
  );
