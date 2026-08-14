import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** 200 dpi is the point where mark brackets and ruled lines stay legible. */
export const RENDER_DPI = 200;
export const BATCH_SIZE = 3;
export const BATCH_OVERLAP = 1;

export class PopplerMissingError extends Error {
  readonly code = 'poppler_missing';
  constructor(binary: string) {
    super(
      `${binary} not found. Install poppler (brew install poppler / apt install poppler-utils).`,
    );
  }
}

export interface PreparedPage {
  page: number;
  /** Path to the rendered PNG on local disk. */
  imagePath: string;
  /** `pdftotext -layout` output for the same page. */
  textLayer: string;
  imageBytes: number;
}

async function requireBinary(binary: string) {
  try {
    await run(binary, ['-v']);
  } catch (error) {
    // ENOENT means the binary is absent. A non-zero exit code does not:
    // pdftoppm and pdftotext both print their version to stderr and exit 99.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PopplerMissingError(binary);
    }
  }
}

export async function pageCount(pdfPath: string): Promise<number> {
  await requireBinary('pdfinfo');
  const { stdout } = await run('pdfinfo', [pdfPath]);
  const match = stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`pdfinfo reported no page count for ${pdfPath}`);
  return Number(match[1]);
}

/**
 * Renders every page to PNG and extracts the text layer.
 *
 * Both are produced because they fail differently: the text layer is the
 * publisher's own characters and has no OCR error, but it loses column order,
 * ruled answer lines and every figure. The image has all of those and no
 * reliable characters. The model is given both and told which to trust for what.
 */
export async function preparePdf(input: {
  pdfPath: string;
  outputDir: string;
  dpi?: number;
}): Promise<PreparedPage[]> {
  await requireBinary('pdftoppm');
  await requireBinary('pdftotext');
  await mkdir(input.outputDir, { recursive: true });

  const total = await pageCount(input.pdfPath);
  const prefix = join(input.outputDir, 'page');

  await run('pdftoppm', ['-png', '-r', String(input.dpi ?? RENDER_DPI), input.pdfPath, prefix]);

  const rendered = (await readdir(input.outputDir))
    .filter((name) => name.startsWith('page') && name.endsWith('.png'))
    .sort();

  const pages: PreparedPage[] = [];
  for (let page = 1; page <= total; page += 1) {
    // pdftoppm zero-pads to the width of the page count.
    const file = rendered.find((name) => Number(name.replace(/\D/g, '')) === page);
    if (!file) continue;

    const imagePath = join(input.outputDir, file);
    const { stdout: textLayer } = await run('pdftotext', [
      '-layout',
      '-f',
      String(page),
      '-l',
      String(page),
      input.pdfPath,
      '-',
    ]);

    pages.push({
      page,
      imagePath,
      textLayer,
      imageBytes: (await stat(imagePath)).size,
    });
  }

  return pages;
}

/**
 * Page batches with a one-page overlap.
 *
 * A question routinely straddles a page break. Without the overlap the batch
 * that sees the first half emits a truncated question and the batch that sees
 * the second half emits an orphan; with it, one batch sees the whole thing and
 * deduplication by `path` keeps the better reading.
 */
export function planBatches(
  pageCount: number,
  size = BATCH_SIZE,
  overlap = BATCH_OVERLAP,
): number[][] {
  if (pageCount <= 0) return [];
  const step = Math.max(1, size - overlap);
  const batches: number[][] = [];

  for (let start = 0; start < pageCount; start += step) {
    const pages = Array.from(
      { length: Math.min(size, pageCount - start) },
      (_, offset) => start + offset + 1,
    );
    batches.push(pages);
    if (pages.at(-1) === pageCount) break;
  }
  return batches;
}

/** Reads a rendered page as base64 for the model request. */
export async function readPageImage(page: PreparedPage): Promise<string> {
  return (await readFile(page.imagePath)).toString('base64');
}
