import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { discoverCorpusSources, parseCambridgeSourceFilename } from './source-discovery.js';

const dirs: string[] = [];
afterEach(async () => Promise.all(dirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

async function tree() {
  const root = await mkdtemp(join(tmpdir(), 'campath-discover-'));
  dirs.push(root);
  const a = join(root, '2025_May_June');
  const b = join(root, 'nested', '2024_ON');
  const c = join(root, '0478', '2023_MJ');
  await mkdir(a, { recursive: true });
  await mkdir(b, { recursive: true });
  await mkdir(c, { recursive: true });
  for (const path of [
    join(a, '9618_s25_qp_11.pdf'), join(a, '9618_s25_ms_11.pdf'), join(a, '9618_s25_qp_12.pdf'),
    join(a, '9618_s25_gt.pdf'), join(a, '9618_s25_in_21.pdf'),
    join(b, '9618_w24_qp_43.pdf'), join(b, '9618_w24_ms_43.pdf'),
    join(c, '0478_s23_qp_21.pdf'), join(c, '0478_s23_ms_21.pdf'), join(c, '0478_s23_pre_21.pdf'),
  ]) await writeFile(path, 'pdf');
  return root;
}

describe('Cambridge source discovery', () => {
  it('parses canonical 9618 and 0478 season/year/kind/paper codes', () => {
    expect(parseCambridgeSourceFilename('9618_s25_qp_11.pdf', '/x/a.pdf')).toEqual({ syllabusCode: '9618', year: 2025, series: 'MJ', paperCode: 11, kind: 'QP', path: '/x/a.pdf' });
    expect(parseCambridgeSourceFilename('9618_W24_MS_43.PDF', '/x/b.pdf')).toEqual({ syllabusCode: '9618', year: 2024, series: 'ON', paperCode: 43, kind: 'MS', path: '/x/b.pdf' });
    expect(parseCambridgeSourceFilename('0478_m23_qp_22.pdf', '/x/c.pdf')).toEqual({ syllabusCode: '0478', year: 2023, series: 'FM', paperCode: 22, kind: 'QP', path: '/x/c.pdf' });
    expect(parseCambridgeSourceFilename('0478_s23_pre_21.pdf', '/x/pre.pdf')).toBeNull();
    expect(parseCambridgeSourceFilename('9618_s25_gt.pdf', '/x/gt.pdf')).toBeNull();
  });

  it('recursively discovers only QP/MS PDFs, keeps syllabus identities separate and reports unpaired variants', async () => {
    const root = await tree();
    const result = await discoverCorpusSources(root);
    expect(result.items.map((item) => `${item.syllabusCode}-${item.year}-${item.series}-${item.paperCode}-${item.kind}`)).toEqual([
      '0478-2023-MJ-21-MS', '0478-2023-MJ-21-QP',
      '9618-2024-ON-43-MS', '9618-2024-ON-43-QP',
      '9618-2025-MJ-11-MS', '9618-2025-MJ-11-QP', '9618-2025-MJ-12-QP',
    ]);
    expect(result.pairCount).toBe(3);
    expect(result.unpaired).toEqual([{ key: '9618-2025-MJ-12', missing: 'MS' }]);
    expect(result.ignoredPdfCount).toBe(3);
  });

  it('allows the same year/series/paper code in different syllabi', async () => {
    const root = await mkdtemp(join(tmpdir(), 'campath-discover-'));
    dirs.push(root);
    for (const name of ['9618_s23_qp_21.pdf', '9618_s23_ms_21.pdf', '0478_s23_qp_21.pdf', '0478_s23_ms_21.pdf']) {
      await writeFile(join(root, name), 'pdf');
    }
    const result = await discoverCorpusSources(root);
    expect(result.pairCount).toBe(2);
    expect(result.unpaired).toEqual([]);
  });

  it('fails when the same canonical QP or MS appears twice in nested folders', async () => {
    const root = await mkdtemp(join(tmpdir(), 'campath-discover-'));
    dirs.push(root);
    const a = join(root, 'a');
    const b = join(root, 'b');
    await mkdir(a);
    await mkdir(b);
    await writeFile(join(a, '0478_s23_qp_21.pdf'), 'x');
    await writeFile(join(b, '0478_s23_qp_21.pdf'), 'x');
    await expect(discoverCorpusSources(root)).rejects.toThrow('duplicate_discovered_source:0478-2023-MJ-21-QP');
  });
});
