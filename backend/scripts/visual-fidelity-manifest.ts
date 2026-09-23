import { createHash } from 'node:crypto';
import { pool } from '../src/database/client.js';

type ManifestRow = {
  element_key: string;
  source_paper_id: string;
  question_id: string;
  question_asset_id: string;
  syllabus_code: string;
  year: number;
  series: string;
  paper: number;
  variant: number;
  display_ref: string | null;
  element_kind: string;
  source_page: number;
  source_bbox: unknown;
  source_sha256: string;
  storage_path: string | null;
  latex_source: string | null;
  svg_markup: string | null;
  content_md: string | null;
  active_reference_count: number;
};

function digest(rows: ManifestRow[]) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

async function main() {
  if (!pool) throw new Error('DATABASE_URL is required');

  const result = await pool.query<ManifestRow>(`
    with canonical_qp as (
      select
        sp.id,
        sp.year,
        sp.series::text as series,
        sp.variant,
        sp.sha256,
        c.number as paper,
        s.code as syllabus_code
      from source_papers sp
      join syllabi s on s.id = sp.syllabus_id
      join components c on c.id = sp.component_id
      where s.code = '9618'
        and sp.kind = 'QP'
        and sp.year between 2021 and 2026
        and sp.variant between 1 and 3
        and (
          (sp.year between 2021 and 2025 and sp.series in ('MJ','ON'))
          or (sp.year = 2026 and sp.series = 'MJ')
        )
    ),
    active_refs as (
      select
        (block.value->>'assetId')::uuid as asset_id,
        count(*)::int as ref_count
      from questions q
      cross join lateral jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) block(value)
      where block.value->>'type' = 'asset'
        and block.value ? 'assetId'
        and (block.value->>'assetId') ~* '^[0-9a-f-]{36}$'
      group by (block.value->>'assetId')::uuid
    )
    select
      ('asset:' || qp.syllabus_code || ':' || qp.year || ':' || qp.series || ':' ||
       qp.paper || qp.variant || ':' || qa.id::text) as element_key,
      qp.id::text as source_paper_id,
      q.id::text as question_id,
      qa.id::text as question_asset_id,
      qp.syllabus_code,
      qp.year,
      qp.series,
      qp.paper,
      qp.variant,
      q.display_ref,
      qa.kind::text as element_kind,
      qa.source_page,
      qa.source_bbox,
      qp.sha256 as source_sha256,
      qa.storage_path,
      qa.latex_source,
      qa.svg_markup,
      qa.content_md,
      coalesce(ar.ref_count,0) as active_reference_count
    from canonical_qp qp
    join questions q on q.source_paper_id = qp.id
    join question_assets qa on qa.question_id = q.id
    left join active_refs ar on ar.asset_id = qa.id
    where qa.source_page is not null
    order by qp.year, qp.series, qp.paper, qp.variant, qa.source_page, q.sort_order, qa.sort_order, qa.id
  `);

  const rows = result.rows;
  const payload = {
    generated_at: new Date().toISOString(),
    syllabus: '9618',
    canonical_asset_rows: rows.length,
    active_asset_rows: rows.filter((row) => row.active_reference_count > 0).length,
    dormant_asset_rows: rows.filter((row) => row.active_reference_count === 0).length,
    source_inventory_digest: digest(rows),
    rows,
  };

  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool?.end();
  });
