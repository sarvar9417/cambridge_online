import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { SourcePageTranscriptCollection } from './source-page-transcript-types';
import {
  SOURCE_TRANSCRIPT_BUNDLES,
  sourcePageToPrintedPage,
  type SourceTranscriptChapter,
} from './source-transcript-bundles';
import {
  CHAPTER_1_SOURCE_FILE_MANIFEST,
  CHAPTER_7_SOURCE_FILE_MANIFEST,
  CHAPTER_13_SOURCE_FILE_MANIFEST,
} from './source-file-fidelity-manifest';

const manifests = {
  1: CHAPTER_1_SOURCE_FILE_MANIFEST,
  7: CHAPTER_7_SOURCE_FILE_MANIFEST,
  13: CHAPTER_13_SOURCE_FILE_MANIFEST,
} as const;

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

const publicAssetPath = (path: string) => {
  const workspacePath = resolve(process.cwd(), 'public', path);
  if (existsSync(workspacePath)) return workspacePath;
  return resolve(process.cwd(), 'frontend', 'public', path);
};

const readBundle = (chapter: SourceTranscriptChapter) => {
  const meta = SOURCE_TRANSCRIPT_BUNDLES[chapter];
  const compressed = Buffer.concat(meta.paths.map(path => readFileSync(publicAssetPath(path))));
  const collection = JSON.parse(gunzipSync(compressed).toString('utf8')) as SourcePageTranscriptCollection;
  return { compressed, collection };
};

describe('full supplied-PDF transcript bundles', () => {
  it('keeps the exact compressed assets fingerprinted and source-file locked', () => {
    for (const chapter of [1,7,13] as const) {
      const meta = SOURCE_TRANSCRIPT_BUNDLES[chapter];
      const manifest = manifests[chapter];
      const { compressed,collection } = readBundle(chapter);

      expect(sha256(compressed), `Chapter ${chapter} gzip`).toBe(meta.gzipSha256);
      expect(collection.sourceFileSha256).toBe(meta.sourceFileSha256);
      expect(collection.sourceFileSha256).toBe(manifest.sourceFileSha256);
      expect(collection.pageCount).toBe(meta.pageCount);
      expect(collection.pages).toHaveLength(meta.pageCount);
    }
  });

  it('contains every source page with source-faithful text and the exact page fingerprint', () => {
    for (const chapter of [1,7,13] as const) {
      const manifest = manifests[chapter];
      const { collection } = readBundle(chapter);
      const expectedByPage = new Map(manifest.pages.map(page=>[page.printedPage,page.sha256]));

      expect(new Set(collection.pages.map(page=>page.printedPage)).size).toBe(manifest.pageCount);
      for (const page of collection.pages) {
        expect(page.text.trim().length, `Chapter ${chapter} p.${page.printedPage} text`).toBeGreaterThan(0);
        expect(page.sha256, `Chapter ${chapter} p.${page.printedPage} manifest hash`).toBe(expectedByPage.get(page.printedPage));
        expect(sha256(page.text), `Chapter ${chapter} p.${page.printedPage} content hash`).toBe(page.sha256);
      }
    }
  });

  it('maps chapter-relative source pages to the textbook printed pages', () => {
    expect(sourcePageToPrintedPage(1,1)).toBe(1);
    expect(sourcePageToPrintedPage(1,26)).toBe(26);
    expect(sourcePageToPrintedPage(7,1)).toBe(258);
    expect(sourcePageToPrintedPage(7,41)).toBe(298);
    expect(sourcePageToPrintedPage(7,258)).toBe(258);
    expect(sourcePageToPrintedPage(13,1)).toBe(304);
    expect(sourcePageToPrintedPage(13,24)).toBe(327);
    expect(sourcePageToPrintedPage(13,304)).toBe(304);
  });

  it('keeps the complete transcript page ranges for all three supplied extracts', () => {
    expect(readBundle(1).collection.pages.map(page=>page.printedPage)).toEqual(Array.from({length:26},(_,index)=>index+1));
    expect(readBundle(7).collection.pages.map(page=>page.printedPage)).toEqual(Array.from({length:41},(_,index)=>258+index));
    expect(readBundle(13).collection.pages.map(page=>page.printedPage)).toEqual(Array.from({length:24},(_,index)=>304+index));
  });
});
