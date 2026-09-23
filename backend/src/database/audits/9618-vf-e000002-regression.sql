-- VF-E-000002 non-mutating regression gate.
--
-- Confirms source identity, corrected Q8 table provenance and unchanged
-- canonical semantics. Product-surface proof remains a separate gate.

with state as (
  select
    q.id question_id,
    q.source_paper_id,
    q.content_json,
    sp.sha256 source_sha256,
    qa.id asset_id,
    qa.question_id asset_question_id,
    qa.source_page asset_source_page,
    qa.source_bbox asset_source_bbox,
    qa.content_hash asset_content_hash
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  join question_assets qa on qa.id='168599f4-5cee-4993-a3b4-d7cecea66c43'
  where q.id='62e94632-92d3-435f-8ea2-61e8a003d6be'
),
checks as (
  select
    source_paper_id='fab329b3-9fbc-43ac-938b-5d83c815a1e5'::uuid as correct_source,
    lower(source_sha256)='d73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453' as source_sha_pinned,
    asset_question_id=question_id as correct_asset_owner,
    asset_source_page=16 as correct_asset_page,
    asset_source_bbox='[141,1007,1512,1330]'::jsonb as correct_asset_bbox,
    asset_content_hash='dc781f64677d717ce77a7e2eca32e3739672dcf300fff8789636c4302a030b76' as legacy_asset_semantics_unchanged,
    content_json#>>'{blocks,0,type}'='text' as task_present,
    content_json#>>'{blocks,1,type}'='table' as table_present,
    content_json#>>'{blocks,1,kind}'='tick_grid' as tick_grid_present,
    content_json#>>'{blocks,1,source,page}'='16' as correct_structured_page,
    content_json#>'{blocks,1,source,bbox}'='[141,1007,1512,1330]'::jsonb as correct_structured_bbox,
    content_json#>'{blocks,1,headers}'='["Statement","AND","NAND","NOR","XOR","OR"]'::jsonb as headers_unchanged,
    jsonb_array_length(content_json#>'{blocks,1,rows}')=3 as three_rows,
    jsonb_array_length(content_json#>'{blocks,1,editableCells}')=15 as fifteen_answer_cells
  from state
)
select jsonb_build_object(
  'defectId','VF-E-000002',
  'pass',(
    correct_source and source_sha_pinned and correct_asset_owner
    and correct_asset_page and correct_asset_bbox
    and legacy_asset_semantics_unchanged and task_present and table_present
    and tick_grid_present and correct_structured_page and correct_structured_bbox
    and headers_unchanged and three_rows and fifteen_answer_cells
  ),
  'classificationBeforeRepair','VF-3',
  'checks',to_jsonb(checks)
) as vf_e000002_regression
from checks;
