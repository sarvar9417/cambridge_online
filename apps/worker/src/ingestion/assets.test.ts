import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { clampBox, cropAssets, MIN_ASSET_BYTES } from './assets.js';
import { preparePdf } from './prepare.js';
import type { ExtractedQuestion } from './types.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const PDF = join(REPO_ROOT, 'papers/2025_Oct_nov/9618_w25_qp_12.pdf');

const question = (over: Partial<ExtractedQuestion> & { path: string }): ExtractedQuestion => ({
  label: over.path,
  parentPath: null,
  stemMd: 'Draw the logic circuit.',
  contextMd: null,
  commandWord: 'Draw',
  marks: 3,
  answerKind: 'diagram',
  answerLines: 0,
  sourcePages: [3],
  assets: [],
  issues: [],
  confidence: 0.95,
  ...over,
});

describe('clampBox', () => {
  it('pads a box and keeps it inside the page', () => {
    expect(clampBox([100, 200, 300, 400], 1000, 1000, 10)).toEqual({
      left: 90,
      top: 190,
      width: 220,
      height: 220,
    });
  });

  it('clamps a box that overshoots the page edge', () => {
    // The model routinely reports a few pixels past the margin; sharp throws on
    // a region outside the image, so the box is clamped rather than dropped.
    const region = clampBox([-20, -30, 1200, 1300], 1000, 1000, 0)!;
    expect(region).toEqual({ left: 0, top: 0, width: 1000, height: 1000 });
  });

  it('normalises a box given corner-reversed', () => {
    expect(clampBox([300, 400, 100, 200], 1000, 1000, 0)).toEqual({
      left: 100,
      top: 200,
      width: 200,
      height: 200,
    });
  });

  it('rejects a degenerate box instead of cropping a sliver', () => {
    expect(clampBox([100, 100, 102, 102], 1000, 1000, 0)).toBeNull();
  });
});

describe('cropAssets', () => {
  const workDirs: string[] = [];
  afterAll(async () => {
    for (const dir of workDirs) await rm(dir, { recursive: true, force: true });
  });

  const newDir = async () => {
    const dir = await mkdtemp(join(tmpdir(), 'campath-assets-'));
    workDirs.push(dir);
    return dir;
  };

  it('skips a table that was transcribed as markdown', async () => {
    const dir = await newDir();
    const put = vi.fn(async (key: string) => key);
    const results = await cropAssets({
      questions: [
        question({
          path: '1',
          assets: [
            {
              kind: 'table',
              contentMd: '| a | b |',
              altText: 'Customer table',
              bbox: [10, 10, 200, 200],
              page: 1,
            },
          ],
        }),
      ],
      pages: [],
      outputDir: dir,
      deps: { put },
    });

    expect(results[0]!.skipped).toBe('transcribed_as_markdown');
    expect(put).not.toHaveBeenCalled();
  });

  it('records a missing bbox rather than throwing', async () => {
    const dir = await newDir();
    const results = await cropAssets({
      questions: [
        question({
          path: '1',
          assets: [{ kind: 'diagram', contentMd: null, altText: 'x', bbox: null, page: 1 }],
        }),
      ],
      pages: [],
      outputDir: dir,
      deps: { put: async (key) => key },
    });
    expect(results[0]!.skipped).toBe('no_bbox');
    expect(results[0]!.storagePath).toBeNull();
  });

  it('records a page that was never rendered', async () => {
    const dir = await newDir();
    const results = await cropAssets({
      questions: [
        question({
          path: '1',
          assets: [
            { kind: 'diagram', contentMd: null, altText: 'x', bbox: [1, 1, 50, 50], page: 9 },
          ],
        }),
      ],
      pages: [],
      outputDir: dir,
      deps: { put: async (key) => key },
    });
    expect(results[0]!.skipped).toBe('page_not_rendered');
  });

  const maybe = existsSync(PDF) ? describe : describe.skip;

  maybe('against a real rendered page', () => {
    it('produces a PNG with a size and a content hash', async () => {
      const renderDir = await newDir();
      const outDir = await newDir();
      const pages = (await preparePdf({ pdfPath: PDF, outputDir: renderDir })).slice(0, 2);

      const put = vi.fn(async (key: string) => key);
      const results = await cropAssets({
        questions: [
          question({
            path: '1.a',
            assets: [
              {
                kind: 'diagram',
                contentMd: null,
                altText: 'Region of page 1',
                // A generous region of a 200 dpi A4 page, well inside the edges.
                bbox: [200, 400, 1400, 1200],
                page: pages[0]!.page,
              },
            ],
          }),
        ],
        pages,
        outputDir: outDir,
        deps: { put },
      });

      const asset = results[0]!;
      expect(asset.skipped).toBeNull();
      expect(asset.storagePath).toMatch(/^question-assets\/1-a-0-[a-f0-9]{12}\.png$/);
      expect(asset.sizeBytes).toBeGreaterThan(MIN_ASSET_BYTES);
      expect(asset.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(put).toHaveBeenCalledOnce();
    }, 120_000);

    it('gives two identical crops the same hash, which is what V22 keys on', async () => {
      const renderDir = await newDir();
      const outDir = await newDir();
      const pages = (await preparePdf({ pdfPath: PDF, outputDir: renderDir })).slice(0, 1);

      const sameBox = {
        kind: 'diagram' as const,
        contentMd: null,
        altText: 'Shared figure',
        bbox: [200, 400, 1200, 1000] as [number, number, number, number],
        page: pages[0]!.page,
      };

      const results = await cropAssets({
        questions: [
          question({ path: '3.a', assets: [sameBox] }),
          question({ path: '3.b', assets: [sameBox] }),
        ],
        pages,
        outputDir: outDir,
        deps: { put: async (key) => key },
      });

      expect(results).toHaveLength(2);
      expect(results[0]!.contentHash).toBe(results[1]!.contentHash);
    }, 120_000);
  });
});
