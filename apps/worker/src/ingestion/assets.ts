import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { PreparedPage } from './prepare.js';
import type { ExtractedAsset, ExtractedQuestion } from './types.js';

/** Below this a crop is a blank rectangle, not a figure. Matches V11. */
export const MIN_ASSET_BYTES = 2048;

/** Padding around a model bbox, in 200 dpi pixels. */
export const CROP_PADDING = 8;

export interface CroppedAsset {
  questionPath: string;
  kind: ExtractedAsset['kind'];
  altText: string;
  contentMd: string | null;
  page: number | null;
  storagePath: string | null;
  sizeBytes: number | null;
  /** sha256 of the cropped bytes; V22 uses it to spot a figure on two siblings. */
  contentHash: string | null;
  /** Why a crop was skipped, when it was. */
  skipped: string | null;
}

export interface CropDeps {
  /** Persists the cropped bytes and returns the storage key. */
  put: (key: string, bytes: Buffer) => Promise<string>;
}

/**
 * Clamps a model bounding box to the page.
 *
 * The model reads a 200 dpi render and reports pixel coordinates in that space,
 * but it routinely overshoots an edge by a few pixels. sharp throws on a region
 * outside the image, so a box that would have produced a usable figure must be
 * clamped rather than dropped.
 */
export function clampBox(
  bbox: [number, number, number, number],
  width: number,
  height: number,
  padding = CROP_PADDING,
): { left: number; top: number; width: number; height: number } | null {
  const [x1, y1, x2, y2] = bbox;
  const left = Math.max(0, Math.floor(Math.min(x1, x2) - padding));
  const top = Math.max(0, Math.floor(Math.min(y1, y2) - padding));
  const right = Math.min(width, Math.ceil(Math.max(x1, x2) + padding));
  const bottom = Math.min(height, Math.ceil(Math.max(y1, y2) + padding));

  const cropWidth = right - left;
  const cropHeight = bottom - top;
  if (cropWidth < 8 || cropHeight < 8) return null;
  return { left, top, width: cropWidth, height: cropHeight };
}

/**
 * Crops every asset the extraction located.
 *
 * A failed crop is recorded rather than thrown: one bad bounding box must not
 * lose a whole paper, and V10/V11 turn the missing figure into a review item
 * with the reason attached.
 */
export async function cropAssets(input: {
  questions: ExtractedQuestion[];
  pages: PreparedPage[];
  outputDir: string;
  deps: CropDeps;
}): Promise<CroppedAsset[]> {
  await mkdir(input.outputDir, { recursive: true });
  const pageByNumber = new Map(input.pages.map((page) => [page.page, page]));
  const results: CroppedAsset[] = [];

  for (const question of input.questions) {
    for (const [index, asset] of question.assets.entries()) {
      const base: CroppedAsset = {
        questionPath: question.path,
        kind: asset.kind,
        altText: asset.altText,
        contentMd: asset.contentMd,
        page: asset.page,
        storagePath: null,
        sizeBytes: null,
        contentHash: null,
        skipped: null,
      };

      // Tables and code arrive as markdown; there is nothing to crop and the
      // text is more useful than a picture of it.
      if (asset.contentMd && asset.kind !== 'diagram' && asset.kind !== 'image') {
        results.push({ ...base, skipped: 'transcribed_as_markdown' });
        continue;
      }

      const page = asset.page === null ? undefined : pageByNumber.get(asset.page);
      if (!asset.bbox || !page) {
        results.push({ ...base, skipped: asset.bbox ? 'page_not_rendered' : 'no_bbox' });
        continue;
      }

      try {
        const image = sharp(page.imagePath);
        const meta = await image.metadata();
        const region = clampBox(asset.bbox, meta.width ?? 0, meta.height ?? 0);
        if (!region) {
          results.push({ ...base, skipped: 'bbox_degenerate' });
          continue;
        }

        const bytes = await image.extract(region).png().toBuffer();
        const contentHash = createHash('sha256').update(bytes).digest('hex');
        const fileName = `${question.path.replace(/\./g, '-')}-${index}-${contentHash.slice(0, 12)}.png`;

        // Written to disk as well so a local run without object storage still
        // produces something a reviewer can open.
        await writeFile(join(input.outputDir, fileName), bytes);
        const storagePath = await input.deps.put(`question-assets/${fileName}`, bytes);

        results.push({
          ...base,
          storagePath,
          sizeBytes: bytes.byteLength,
          contentHash,
          skipped: bytes.byteLength <= MIN_ASSET_BYTES ? 'crop_too_small' : null,
        });
      } catch (error) {
        results.push({ ...base, skipped: `crop_failed: ${(error as Error).message}` });
      }
    }
  }

  return results;
}

/** Writes crops to the local output directory only; used when S3 is unset. */
export const localOnlyPut: CropDeps['put'] = async (key) => key;
