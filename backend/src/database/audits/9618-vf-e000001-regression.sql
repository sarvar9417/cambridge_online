-- VF-E-000001 non-mutating regression gate.
--
-- Release target:
--   * exact source SHA remains pinned;
--   * instruction-set asset belongs to Q3(b), not Q3 root;
--   * exact source page/bbox and repaired content hash are present;
--   * portable ancestor-chain consumption reaches Q3(b) only;
--   * the remaining Q3(b) visual assets retain page order after the move.

with recursive asset_state as (
  select
    qa.id,
    qa.question_id,
    qa.source_page,
    qa.source_bbox,
    qa.sort_order,
    qa.content_hash,
    qa.svg_markup,
    q.source_paper_id,
    sp.sha256
  from question_assets qa
  join questions q on q.id=qa.question_id
  join source_papers sp on sp.id=q.source_paper_id
  where qa.id='f9483ad1-7672-4b18-bd0c-cb6b21507950'
),
descendants as (
  select q.id,q.parent_id,q.display_ref,q.marks
  from questions q
  join asset_state a on a.question_id=q.id

  union all

  select child.id,child.parent_id,child.display_ref,child.marks
  from descendants parent
  join questions child on child.parent_id=parent.id
),
consumers as (
  select display_ref
  from descendants
  where marks is not null and marks>0
),
target_order as (
  select jsonb_agg(
    jsonb_build_object('id',qa.id,'sourcePage',qa.source_page,'sortOrder',qa.sort_order)
    order by qa.sort_order,qa.id
  ) as assets
  from question_assets qa
  where qa.question_id='6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'
),
checks as (
  select
    coalesce((select count(*)=1 from asset_state),false) as asset_exists,
    coalesce((select question_id='6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee' from asset_state),false) as correct_owner,
    coalesce((select source_paper_id='fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid from asset_state),false) as correct_source,
    coalesce((select lower(sha256)='d73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453' from asset_state),false) as source_sha_pinned,
    coalesce((select source_page=7 from asset_state),false) as correct_page,
    coalesce((select source_bbox='[89,286,1565,1549]'::jsonb from asset_state),false) as correct_bbox,
    coalesce((select content_hash='3eb93fb3af37767404486d5f5188fef371cdb870f886d6f12eb7bf39a116fef3' from asset_state),false) as correct_content_hash,
    coalesce((select svg_markup like '<svg%' from asset_state),false) as svg_renderable,
    coalesce((select array_agg(display_ref order by display_ref)=array['9618/11/M/J/21 Q3(b)']::text[] from consumers),false) as q3b_only_portable_consumer,
    coalesce((
      select array_agg(source_page order by sort_order,id)=array[7,8,8,9]::integer[]
      from question_assets
      where question_id='6b1f48a6-22ba-4522-a8a4-33c41bcfa9ee'
    ),false) as source_order_preserved
)
select jsonb_build_object(
  'defectId','VF-E-000001',
  'pass',(
    asset_exists and correct_owner and correct_source and source_sha_pinned
    and correct_page and correct_bbox and correct_content_hash and svg_renderable
    and q3b_only_portable_consumer and source_order_preserved
  ),
  'checks',to_jsonb(checks),
  'portableConsumers',coalesce((select jsonb_agg(display_ref order by display_ref) from consumers),'[]'::jsonb),
  'targetAssets',(select assets from target_order)
) as vf_e000001_regression
from checks;
