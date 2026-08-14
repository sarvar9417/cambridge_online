import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { pageCount, preparePdf } from './prepare.js';

/**
 * PREPARE against a real Cambridge PDF.
 *
 * Skips when the paper corpus is absent, because `papers/` is gitignored:
 * the PDFs are copyright-restricted and must not be committed.
 */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const PDF = join(REPO_ROOT, 'papers/2025_Oct_nov/9618_w25_qp_12.pdf');
const available = existsSync(PDF);
const maybe = available ? describe : describe.skip;

let workDir: string | undefined;
afterAll(async () => {
  if (workDir) await rm(workDir, { recursive: true, force: true });
});

maybe('PREPARE on a real 9618 paper', () => {
  it('reads the page count with pdfinfo', async () => {
    const pages = await pageCount(PDF);
    expect(pages).toBeGreaterThan(5);
    expect(pages).toBeLessThan(40);
  });

  it('renders every page and extracts a text layer for each', async () => {
    workDir = await mkdtemp(join(tmpdir(), 'campath-prepare-'));
    const pages = await preparePdf({ pdfPath: PDF, outputDir: workDir });

    expect(pages.length).toBe(await pageCount(PDF));
    for (const page of pages) {
      // A 200 dpi A4 render is hundreds of KB; anything tiny is a failed render.
      expect(page.imageBytes).toBeGreaterThan(20_000);
      expect(existsSync(page.imagePath)).toBe(true);
    }

    // The text layer is the reason both outputs exist: it carries the exact
    // wording the model is told to trust over the image.
    const allText = pages.map((page) => page.textLayer).join('\n');
    expect(allText).toMatch(/9618/);
    expect(allText.length).toBeGreaterThan(1000);
  }, 120_000);
});
