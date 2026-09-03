import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { MAX_SOURCE_PDF_BYTES, normalizeRemoteSourceUrl } from './source-paper-file.js';

export type CorpusSyllabusCode = '9618' | '0478';

export interface SourceStageItem {
  syllabusCode: CorpusSyllabusCode;
  year: number;
  series: 'FM' | 'MJ' | 'ON';
  paperCode: number;
  kind: 'QP' | 'MS';
  path?: string;
  sourceUrl?: string;
}

export interface StagedSource {
  key: string;
  sourcePaperId: string;
  sha256: string;
  path: string;
  sourceUrl: string | null;
}

type FetchLike = typeof fetch;

type ValidatedStageItem = Omit<SourceStageItem, 'sourceUrl'> & {
  component: number;
  variant: number;
  storagePath: string;
  sourceUrl: string | null;
  sha256: string;
};

const corpusRules: Record<CorpusSyllabusCode, { minYear: number; maxComponent: number }> = {
  '9618': { minYear: 2021, maxComponent: 4 },
  '0478': { minYear: 2015, maxComponent: 2 },
};

export function isCorpusSyllabusCode(value: string): value is CorpusSyllabusCode {
  return value === '9618' || value === '0478';
}

export function parsePaperCode(paperCode: number, syllabusCode: CorpusSyllabusCode = '9618') {
  const component = Math.floor(paperCode / 10);
  const variant = paperCode % 10;
  const maxComponent = corpusRules[syllabusCode].maxComponent;
  if (component < 1 || component > maxComponent || variant < 1 || variant > 3) {
    throw new Error(`invalid_paper_code:${syllabusCode}:${paperCode}`);
  }
  return { component, variant };
}

export async function validateStageManifest(items: SourceStageItem[], fetchImpl: FetchLike = fetch): Promise<ValidatedStageItem[]> {
  const seen = new Set<string>();
  const validated: ValidatedStageItem[] = [];

  for (const item of items) {
    if (!isCorpusSyllabusCode(item.syllabusCode)) throw new Error(`unsupported_syllabus:${item.syllabusCode}`);
    const rules = corpusRules[item.syllabusCode];
    if (!Number.isInteger(item.year) || item.year < rules.minYear || item.year > 2100) {
      throw new Error(`invalid_year:${item.syllabusCode}:${item.year}`);
    }

    const { component, variant } = parsePaperCode(item.paperCode, item.syllabusCode);
    const key = `${item.syllabusCode}-${item.year}-${item.series}-${item.paperCode}-${item.kind}`;
    if (seen.has(key)) throw new Error(`duplicate_manifest_key:${key}`);
    seen.add(key);

    const hasLocal = Boolean(item.path?.trim());
    const hasRemote = Boolean(item.sourceUrl?.trim());
    if (hasLocal === hasRemote) throw new Error(`source_location_requires_exactly_one:${key}`);

    if (hasRemote) {
      const sourceUrl = item.sourceUrl!.trim();
      const bytes = await downloadRemotePdf(sourceUrl, fetchImpl);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      validated.push({
        ...item,
        component,
        variant,
        storagePath: remoteStoragePlaceholder(item, sourceUrl),
        sourceUrl,
        sha256,
      });
      continue;
    }

    const absolutePath = resolve(item.path!);
    const info = await stat(absolutePath);
    if (!info.isFile() || info.size < 1000) throw new Error(`invalid_source_file:${item.path}`);
    if (info.size > MAX_SOURCE_PDF_BYTES) throw new Error(`source_file_too_large:${item.path}`);
    const bytes = await readFile(absolutePath);
    assertPdfBytes(bytes);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    validated.push({
      ...item,
      component,
      variant,
      storagePath: absolutePath,
      sourceUrl: null,
      sha256,
    });
  }

  return validated;
}

export async function registerStagedSources(pool: Pool, items: SourceStageItem[], fetchImpl: FetchLike = fetch): Promise<StagedSource[]> {
  const validated = await validateStageManifest(items, fetchImpl);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const output: StagedSource[] = [];

    for (const item of validated) {
      const lookup = await client.query(
        `select s.id syllabus_id,c.id component_id
         from syllabi s
         join components c on c.syllabus_id=s.id
         where s.code=$1 and c.number=$2 and s.valid_from<=$3 and s.valid_to>=$3
         order by s.valid_from desc`,
        [item.syllabusCode, item.component, item.year],
      );
      if (!lookup.rowCount) {
        throw new Error(`syllabus_component_not_found:${item.syllabusCode}/${item.component}/${item.year}`);
      }
      if (lookup.rowCount !== 1) {
        throw new Error(`syllabus_component_version_ambiguous:${item.syllabusCode}/${item.component}/${item.year}:${lookup.rowCount}`);
      }

      const row = lookup.rows[0];
      const existing = await client.query(
        `select id,sha256 from source_papers
         where syllabus_id=$1 and component_id=$2 and year=$3 and series=$4 and variant=$5 and kind=$6
         for update`,
        [row.syllabus_id, row.component_id, item.year, item.series, item.variant, item.kind],
      );

      let sourcePaperId: string;
      if (existing.rowCount) {
        const current = existing.rows[0];
        const currentSha = String(current.sha256);
        sourcePaperId = String(current.id);
        if (currentSha !== item.sha256) {
          await assertSourceRevisionSafe(client, sourcePaperId);
          const updated = await client.query(
            `update source_papers
             set storage_path=$2,source_url=$3,sha256=$4,page_count=null
             where id=$1 returning id`,
            [sourcePaperId, item.storagePath, item.sourceUrl, item.sha256],
          );
          sourcePaperId = String(updated.rows[0].id);
        } else {
          const updated = await client.query(
            `update source_papers set storage_path=$2,source_url=$3 where id=$1 returning id`,
            [sourcePaperId, item.storagePath, item.sourceUrl],
          );
          sourcePaperId = String(updated.rows[0].id);
        }
      } else {
        const inserted = await client.query(
          `insert into source_papers(syllabus_id,component_id,year,series,variant,kind,storage_path,source_url,sha256)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
          [row.syllabus_id, row.component_id, item.year, item.series, item.variant, item.kind, item.storagePath, item.sourceUrl, item.sha256],
        );
        sourcePaperId = String(inserted.rows[0].id);
      }

      output.push({
        key: `${item.year}-${item.series}-${item.paperCode}-${item.kind}`,
        sourcePaperId,
        sha256: item.sha256,
        path: item.storagePath,
        sourceUrl: item.sourceUrl,
      });
    }

    await client.query('commit');
    return output;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function downloadRemotePdf(sourceUrl: string, fetchImpl: FetchLike) {
  const normalized = normalizeRemoteSourceUrl(sourceUrl);
  const response = await fetchImpl(normalized, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
    headers: { 'user-agent': 'CambridgeOnlineCorpusStage/1.0' },
  });
  if (!response.ok) throw new Error(`source_stage_download_http:${response.status}`);
  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > MAX_SOURCE_PDF_BYTES) throw new Error('source_stage_download_too_large');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1000) throw new Error('source_stage_download_too_small');
  if (bytes.length > MAX_SOURCE_PDF_BYTES) throw new Error('source_stage_download_too_large');
  assertPdfBytes(bytes);
  return bytes;
}

function assertPdfBytes(bytes: Buffer) {
  if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('source_stage_not_pdf');
  }
}

function remoteStoragePlaceholder(item: SourceStageItem, sourceUrl: string) {
  let filename = '';
  try {
    const parsed = new URL(sourceUrl);
    filename = basename(parsed.pathname).replace(/[^a-zA-Z0-9._-]+/g, '_');
  } catch {
    // URL validation is performed by normalizeRemoteSourceUrl before this helper is called.
  }
  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename = `${item.syllabusCode}_${seriesLetter(item.series)}${String(item.year).slice(-2)}_${item.kind.toLowerCase()}_${item.paperCode}.pdf`;
  }
  return `remote/${item.syllabusCode}/${item.year}/${item.series}/${filename}`;
}

function seriesLetter(series: SourceStageItem['series']) {
  return series === 'FM' ? 'm' : series === 'MJ' ? 's' : 'w';
}

async function assertSourceRevisionSafe(client: PoolClient, sourcePaperId: string) {
  const result = await client.query(
    `select count(*)::int in_use
     from questions q
     where q.source_paper_id=$1
       and (exists(select 1 from assignment_questions aq where aq.question_id=q.id)
         or exists(select 1 from answers a where a.question_id=q.id))`,
    [sourcePaperId],
  );
  const inUse = Number(result.rows[0]?.in_use ?? 0);
  if (inUse > 0) throw new Error(`source_paper_revision_required:${sourcePaperId}:${inUse}`);
}
