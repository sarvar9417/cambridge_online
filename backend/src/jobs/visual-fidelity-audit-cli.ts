import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { config } from '../config.js';
import { pool } from '../database/client.js';
import {
  normalizeSourceBbox,
  pdftoppmSourceArgs,
  QP_REQUIRED_VISUAL_FIDELITY_SURFACES,
  sha256Hex,
} from '../lib/visual-fidelity-evidence.js';

const execFileAsync = promisify(execFile);

type SourcePaperRow = {
  id: string;
  syllabus_code: string;
  year: number;
  series: 'MJ' | 'ON';
  variant: number | null;
  kind: string;
  sha256: string | null;
  page_count: number | null;
  source_url: string | null;
  component_number: number;
};

type AssetOccurrenceRow = {
  occurrence_id: string;
  question_id: string;
  display_ref: string;
  is_primary: boolean;
  asset_id: string;
  kind: string;
  source_page: number | null;
  source_bbox: unknown;
  crop_status: string | null;
  content_hash: string | null;
  has_storage: boolean;
  has_svg: boolean;
  has_latex: boolean;
  has_structured_md: boolean;
  is_referenced: boolean;
};

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`invalid_integer:${value}`);
  return parsed;
}

function sessionLabel(series: SourcePaperRow['series']) {
  return series === 'MJ' ? 'M/J' : 'O/N';
}

function paperRef(source: SourcePaperRow) {
  if (source.variant === null) return `${source.syllabus_code}/${source.component_number}/${sessionLabel(source.series)}/${String(source.year).slice(-2)}`;
  return `${source.syllabus_code}/${source.component_number}${source.variant}/${sessionLabel(source.series)}/${String(source.year).slice(-2)}`;
}

function assertCanonical9618Qp(source: SourcePaperRow) {
  const canonicalSeries =
    (source.year >= 2021 && source.year <= 2025 && (source.series === 'MJ' || source.series === 'ON'))
    || (source.year === 2026 && source.series === 'MJ');
  if (
    source.syllabus_code !== '9618'
    || source.kind !== 'QP'
    || source.variant === null
    || source.variant < 1
    || source.variant > 3
    || !canonicalSeries
  ) {
    throw new Error(`visual_fidelity_noncanonical_source:${paperRef(source)}`);
  }
}

function pageCountFromPdfInfo(stdout: string) {
  const pages = Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
  if (!Number.isInteger(pages) || pages < 1) throw new Error('visual_fidelity_pdf_page_count_unreadable');
  return pages;
}

async function renderPng(input: {
  sourcePdf: string;
  page: number;
  outputPrefix: string;
  dpi: number;
  bbox?: ReturnType<typeof normalizeSourceBbox>;
}) {
  await execFileAsync(
    config.PDFTOPPM_PATH,
    pdftoppmSourceArgs({
      pdfPath: input.sourcePdf,
      page: input.page,
      outputPrefix: input.outputPrefix,
      dpi: input.dpi,
      bbox: input.bbox,
    }),
    { maxBuffer: 8 * 1024 * 1024 },
  );
  const path = `${input.outputPrefix}.png`;
  const bytes = await readFile(path);
  if (bytes.byteLength < 100) throw new Error(`visual_fidelity_render_too_small:${path}`);
  return { path, sha256: sha256Hex(bytes), bytes: bytes.byteLength };
}

async function main() {
  if (!pool) throw new Error('DATABASE_URL is required');
  const sourcePaperId = argument('--source-paper-id');
  const sourcePdf = argument('--source-pdf');
  if (!sourcePaperId || !sourcePdf) {
    throw new Error(
      'usage: tsx src/jobs/visual-fidelity-audit-cli.ts --source-paper-id <uuid> --source-pdf <exact-sha-matched.pdf> [--output-dir <dir>] [--dpi 200]',
    );
  }
  const dpi = parsePositiveInt(argument('--dpi'), 200);
  if (dpi < 72 || dpi > 600) throw new Error(`visual_fidelity_invalid_dpi:${dpi}`);

  const sourceResult = await pool.query<SourcePaperRow>(
    `select
       sp.id,
       s.code syllabus_code,
       sp.year,
       sp.series::text series,
       sp.variant,
       sp.kind::text kind,
       sp.sha256,
       sp.page_count,
       sp.source_url,
       c.number component_number
     from source_papers sp
     join syllabi s on s.id=sp.syllabus_id
     join components c on c.id=sp.component_id
     where sp.id=$1`,
    [sourcePaperId],
  );
  const source = sourceResult.rows[0];
  if (!source) throw new Error(`visual_fidelity_source_paper_missing:${sourcePaperId}`);
  assertCanonical9618Qp(source);

  const exactPdfPath = resolve(sourcePdf);
  const sourceBytes = await readFile(exactPdfPath);
  const localSha256 = sha256Hex(sourceBytes);
  if (!source.sha256 || localSha256.toLowerCase() !== source.sha256.toLowerCase()) {
    throw new Error(
      `visual_fidelity_source_sha_mismatch:${source.sha256 ?? 'missing'}:${localSha256}`,
    );
  }
  const { stdout: pdfInfo } = await execFileAsync('pdfinfo', [exactPdfPath], { maxBuffer: 1024 * 1024 });
  const localPageCount = pageCountFromPdfInfo(pdfInfo);
  if (source.page_count !== null && localPageCount !== source.page_count) {
    throw new Error(`visual_fidelity_source_page_count_mismatch:${source.page_count}:${localPageCount}`);
  }

  const occurrences = await pool.query<AssetOccurrenceRow>(
    `with referenced_assets as (
       select distinct (block->>'assetId')::uuid asset_id
       from questions consumer
       cross join lateral jsonb_array_elements(coalesce(consumer.content_json->'blocks','[]'::jsonb)) block
       where block->>'type'='asset'
         and block->>'assetId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     )
     select
       qso.id occurrence_id,
       qso.question_id,
       qso.display_ref,
       qso.is_primary,
       qa.id asset_id,
       qa.kind::text kind,
       qa.source_page,
       qa.source_bbox,
       qa.crop_status,
       qa.content_hash,
       (qa.storage_path is not null and btrim(qa.storage_path)<>'') has_storage,
       (qa.svg_markup is not null and btrim(qa.svg_markup)<>'') has_svg,
       (qa.latex_source is not null and btrim(qa.latex_source)<>'') has_latex,
       (qa.content_md is not null and btrim(qa.content_md)<>'') has_structured_md,
       (ra.asset_id is not null) is_referenced
     from question_source_occurrences qso
     join questions q on q.id=qso.question_id
     join question_assets qa on qa.question_id=q.id
     left join referenced_assets ra on ra.asset_id=qa.id
     where qso.source_paper_id=$1
     order by qa.source_page nulls last,qso.display_ref,qa.sort_order,qa.id`,
    [sourcePaperId],
  );

  const slug = paperRef(source).replaceAll('/', '-');
  const outputRoot = resolve(argument('--output-dir') ?? `tmp/visual-fidelity/${slug}`);
  const pageDir = join(outputRoot, 'source-pages');
  const assetDir = join(outputRoot, 'source-assets');
  await mkdir(pageDir, { recursive: true });
  await mkdir(assetDir, { recursive: true });

  const pageEvidence = new Map<number, Awaited<ReturnType<typeof renderPng>>>();
  for (const page of [...new Set(
    occurrences.rows
      .filter((row) => row.is_primary)
      .map((row) => row.source_page)
      .filter((value): value is number => value !== null),
  )].sort((a, b) => a - b)) {
    if (page < 1 || page > localPageCount) {
      throw new Error(`visual_fidelity_asset_page_out_of_range:${page}/${localPageCount}`);
    }
    const pageRender = await renderPng({
      sourcePdf: exactPdfPath,
      page,
      outputPrefix: join(pageDir, `page-${String(page).padStart(3, '0')}`),
      dpi,
    });
    pageEvidence.set(page, pageRender);
  }

  const manifestRows: Array<Record<string, unknown>> = [];
  for (const row of occurrences.rows) {
    if (!row.is_primary) {
      manifestRows.push({
        occurrenceId: row.occurrence_id,
        questionId: row.question_id,
        displayRef: row.display_ref,
        isPrimaryOccurrence: false,
        assetId: row.asset_id,
        kind: row.kind,
        consumerState: row.is_referenced ? 'active' : 'dormant',
        sourcePage: null,
        sourceBbox: null,
        sourceEvidence: null,
        representations: {
          storage: row.has_storage,
          svg: row.has_svg,
          latex: row.has_latex,
          structuredMd: row.has_structured_md,
        },
        contentHash: row.content_hash,
        cropStatus: row.crop_status,
        classification: 'VF-5',
        blocker: 'non_primary_occurrence_requires_occurrence_specific_source_mapping',
        requiredSurfaces: row.is_referenced ? QP_REQUIRED_VISUAL_FIDELITY_SURFACES : [],
      });
      continue;
    }

    if (row.source_page === null) {
      manifestRows.push({
        occurrenceId: row.occurrence_id,
        questionId: row.question_id,
        displayRef: row.display_ref,
        isPrimaryOccurrence: row.is_primary,
        assetId: row.asset_id,
        kind: row.kind,
        consumerState: row.is_referenced ? 'active' : 'dormant',
        sourcePage: null,
        sourceBbox: null,
        sourceEvidence: null,
        representations: {
          storage: row.has_storage,
          svg: row.has_svg,
          latex: row.has_latex,
          structuredMd: row.has_structured_md,
        },
        contentHash: row.content_hash,
        cropStatus: row.crop_status,
        classification: 'VF-5',
        blocker: 'source_page_missing',
        requiredSurfaces: row.is_referenced ? QP_REQUIRED_VISUAL_FIDELITY_SURFACES : [],
      });
      continue;
    }

    const bbox = normalizeSourceBbox(row.source_bbox);
    const pageRender = pageEvidence.get(row.source_page);
    if (!pageRender) throw new Error(`visual_fidelity_source_page_not_rendered:${row.source_page}`);

    let elementRender: Awaited<ReturnType<typeof renderPng>> | null = null;
    if (bbox) {
      elementRender = await renderPng({
        sourcePdf: exactPdfPath,
        page: row.source_page,
        outputPrefix: join(assetDir, row.asset_id),
        dpi,
        bbox,
      });
    }

    manifestRows.push({
      occurrenceId: row.occurrence_id,
      questionId: row.question_id,
      displayRef: row.display_ref,
      isPrimaryOccurrence: row.is_primary,
      assetId: row.asset_id,
      kind: row.kind,
      consumerState: row.is_referenced ? 'active' : 'dormant',
      sourcePage: row.source_page,
      sourceBbox: bbox,
      sourceEvidence: {
        scope: elementRender ? 'bbox' : 'page',
        pagePath: relative(outputRoot, pageRender.path),
        pageSha256: pageRender.sha256,
        elementPath: elementRender ? relative(outputRoot, elementRender.path) : null,
        elementSha256: elementRender?.sha256 ?? null,
        requiresManualLocate: !elementRender,
      },
      representations: {
        storage: row.has_storage,
        svg: row.has_svg,
        latex: row.has_latex,
        structuredMd: row.has_structured_md,
      },
      contentHash: row.content_hash,
      cropStatus: row.crop_status,
      classification: 'VF-5',
      blocker: elementRender
        ? 'product_surface_evidence_not_captured'
        : 'source_bbox_missing_manual_localisation_required_without_ocr_guess',
      requiredSurfaces: row.is_referenced ? QP_REQUIRED_VISUAL_FIDELITY_SURFACES : [],
    });
  }

  const manifest = {
    version: '9618-visual-fidelity-manifest-v1',
    generatedAt: new Date().toISOString(),
    source: {
      sourcePaperId: source.id,
      paperRef: paperRef(source),
      sourceUrl: source.source_url,
      sourcePdf: exactPdfPath,
      expectedSha256: source.sha256,
      actualSha256: localSha256,
      expectedPageCount: source.page_count,
      actualPageCount: localPageCount,
      dpi,
    },
    summary: {
      occurrenceCount: manifestRows.length,
      activeOccurrenceCount: manifestRows.filter((row) => row.consumerState === 'active').length,
      dormantOccurrenceCount: manifestRows.filter((row) => row.consumerState === 'dormant').length,
      bboxEvidenceCount: manifestRows.filter(
        (row) => (row.sourceEvidence as { scope?: string } | null)?.scope === 'bbox',
      ).length,
      manualLocalisationCount: manifestRows.filter(
        (row) => (row.sourceEvidence as { requiresManualLocate?: boolean } | null)?.requiresManualLocate,
      ).length,
    },
    requiredQpSurfaces: QP_REQUIRED_VISUAL_FIDELITY_SURFACES,
    occurrences: manifestRows,
  };

  await writeFile(join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (pool) await pool.end().catch(() => undefined);
  });
