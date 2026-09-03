import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { parsePaperCode, registerStagedSources, validateStageManifest } from './source-stage-manifest.js';

const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

async function source(size = 2048, fill = 7, filename = '9618_s25_qp_11.pdf') {
  const dir = await mkdtemp(join(tmpdir(), 'campath-source-'));
  dirs.push(dir);
  const path = join(dir, filename);
  const bytes = Buffer.alloc(size, fill);
  if (size >= 5) bytes.write('%PDF-', 0, 'ascii');
  await writeFile(path, bytes);
  return path;
}

function stagedPool(options: { syllabusRows?: Array<{ syllabus_id: string; component_id: string }>; sourceRows?: Array<{ id: string; sha256: string }>; inUse?: number } = {}) {
  const syllabusRows = options.syllabusRows ?? [{ syllabus_id: 's1', component_id: 'c1' }];
  const sourceRows = options.sourceRows ?? [];
  const query = vi.fn(async (sql: string, _values?: unknown[]) => {
    if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return { rowCount: null, rows: [] };
    if (sql.includes('select s.id syllabus_id')) return { rowCount: syllabusRows.length, rows: syllabusRows };
    if (sql.includes('select id,sha256 from source_papers')) return { rowCount: sourceRows.length, rows: sourceRows };
    if (sql.includes('select count(*)::int in_use')) return { rowCount: 1, rows: [{ in_use: options.inUse ?? 0 }] };
    if (sql.includes('insert into source_papers')) return { rowCount: 1, rows: [{ id: 'paper1' }] };
    if (sql.includes('update source_papers')) return { rowCount: 1, rows: [{ id: sourceRows[0]?.id ?? 'paper1' }] };
    throw new Error(`unexpected ${sql}`);
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;
  return { pool, query, client };
}

describe('source staging manifest', () => {
  it('parses syllabus-specific component and variant rules', () => {
    expect(parsePaperCode(11)).toEqual({ component: 1, variant: 1 });
    expect(parsePaperCode(43, '9618')).toEqual({ component: 4, variant: 3 });
    expect(parsePaperCode(23, '0478')).toEqual({ component: 2, variant: 3 });
    expect(() => parsePaperCode(31, '0478')).toThrow('invalid_paper_code:0478:31');
    expect(() => parsePaperCode(49, '9618')).toThrow('invalid_paper_code:9618:49');
  });

  it('hashes and validates canonical 9618 and 0478 local sources without writing the DB', async () => {
    const p9618 = await source();
    const p0478 = await source(2048, 8, '0478_s23_qp_21.pdf');
    const rows = await validateStageManifest([
      { syllabusCode: '9618', year: 2025, series: 'MJ', paperCode: 11, kind: 'QP', path: p9618 },
      { syllabusCode: '0478', year: 2023, series: 'MJ', paperCode: 21, kind: 'QP', path: p0478 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ component: 1, variant: 1, storagePath: p9618, sourceUrl: null });
    expect(rows[1]).toMatchObject({ component: 2, variant: 1, storagePath: p0478, sourceUrl: null });
    expect(rows.every((row) => row.sha256.length === 64)).toBe(true);
  });

  it('accepts the supplied 0478 historical window and rejects older years', async () => {
    const path = await source(2048, 8, '0478_s15_qp_11.pdf');
    await expect(validateStageManifest([{ syllabusCode: '0478', year: 2015, series: 'MJ', paperCode: 11, kind: 'QP', path }])).resolves.toHaveLength(1);
    await expect(validateStageManifest([{ syllabusCode: '0478', year: 2014, series: 'MJ', paperCode: 11, kind: 'QP', path }])).rejects.toThrow('invalid_year:0478:2014');
  });

  it('rejects duplicate canonical manifest keys and tiny files', async () => {
    const path = await source();
    const item = { syllabusCode: '9618' as const, year: 2025, series: 'MJ' as const, paperCode: 11, kind: 'QP' as const, path };
    await expect(validateStageManifest([item, item])).rejects.toThrow('duplicate_manifest_key');
    const tiny = await source(20);
    await expect(validateStageManifest([{ ...item, path: tiny }])).rejects.toThrow('invalid_source_file');
  });

  it('binds a staged paper to the syllabus version whose validity range contains the exam year', async () => {
    const path = await source(2048, 8, '0478_s23_qp_21.pdf');
    const h = stagedPool();
    const result = await registerStagedSources(h.pool, [{ syllabusCode: '0478', year: 2023, series: 'MJ', paperCode: 21, kind: 'QP', path }]);
    expect(result[0]).toMatchObject({ key: '2023-MJ-21-QP', sourcePaperId: 'paper1', path, sourceUrl: null });
    const lookup = h.query.mock.calls.find(([sql]) => String(sql).includes('select s.id syllabus_id'))!;
    expect(lookup[0]).toContain('s.valid_from<=$3');
    expect(lookup[0]).toContain('s.valid_to>=$3');
    expect(lookup[1]).toEqual(['0478', 2, 2023]);
    expect(h.query).toHaveBeenCalledWith('commit');
  });

  it('fails closed when no syllabus version covers the paper year', async () => {
    const path = await source();
    const h = stagedPool({ syllabusRows: [] });
    await expect(registerStagedSources(h.pool, [{ syllabusCode: '9618', year: 2025, series: 'MJ', paperCode: 11, kind: 'QP', path }])).rejects.toThrow('syllabus_component_not_found:9618/1/2025');
    expect(h.query).toHaveBeenCalledWith('rollback');
    expect(h.query.mock.calls.some(([sql]) => String(sql).includes('insert into source_papers'))).toBe(false);
  });

  it('fails closed when overlapping syllabus versions both claim the same exam year', async () => {
    const path = await source();
    const h = stagedPool({ syllabusRows: [{ syllabus_id: 's-old', component_id: 'c-old' }, { syllabus_id: 's-new', component_id: 'c-new' }] });
    await expect(registerStagedSources(h.pool, [{ syllabusCode: '9618', year: 2025, series: 'MJ', paperCode: 11, kind: 'QP', path }])).rejects.toThrow('syllabus_component_version_ambiguous:9618/1/2025:2');
    expect(h.query).toHaveBeenCalledWith('rollback');
  });

  it('updates only the local path when the staged bytes are unchanged', async () => {
    const path = await source();
    const validated = await validateStageManifest([{ syllabusCode: '9618', year: 2025, series: 'MJ', paperCode: 11, kind: 'QP', path }]);
    const h = stagedPool({ sourceRows: [{ id: 'paper1', sha256: validated[0]!.sha256 }] });
    await expect(registerStagedSources(h.pool, [{ syllabusCode: '9618', year: 2025, series: 'MJ', paperCode: 11, kind: 'QP', path }])).resolves.toHaveLength(1);
    expect(h.query.mock.calls.some(([sql]) => String(sql).includes('select count(*)::int in_use'))).toBe(false);
  });

  it('refuses a changed source revision when existing questions are already in use', async () => {
    const path = await source(2048, 9);
    const h = stagedPool({ sourceRows: [{ id: 'paper-used', sha256: 'old-sha' }], inUse: 3 });
    await expect(registerStagedSources(h.pool, [{ syllabusCode: '9618', year: 2025, series: 'MJ', paperCode: 11, kind: 'QP', path }])).rejects.toThrow('source_paper_revision_required:paper-used:3');
    expect(h.query).toHaveBeenCalledWith('rollback');
  });
});
