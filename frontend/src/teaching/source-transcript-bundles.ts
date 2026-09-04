import type { SourcePageTranscriptCollection } from './source-page-transcript-types';

export type SourceTranscriptChapter = 1 | 7 | 13;

export type SourceTranscriptBundleMeta = {
  chapter: SourceTranscriptChapter;
  paths: string[];
  gzipSha256: string;
  sourceFileSha256: string;
  pageCount: number;
};

export const SOURCE_TRANSCRIPT_BUNDLES: Record<SourceTranscriptChapter, SourceTranscriptBundleMeta> = {
  1: {
    chapter: 1,
    paths: [
      'source-transcripts/chapter-1.part-1.b64',
      'source-transcripts/chapter-1.part-2.b64',
      'source-transcripts/chapter-1.part-3.b64',
    ],
    gzipSha256: '55dc0f2fe6ecc2a09b9c958264bc3f6095bc24d0374aa2d17ecd888b69ec87cf',
    sourceFileSha256: 'a9420141b1dd659b739a672fd902e78420baaacde09a2a8b63ae9598bf313807',
    pageCount: 26,
  },
  7: {
    chapter: 7,
    paths: [
      'source-transcripts/chapter-7.part-1.b64',
      'source-transcripts/chapter-7.part-2.b64',
      'source-transcripts/chapter-7.part-3.b64',
    ],
    gzipSha256: 'a9702526422d4b85f0d2d0ad2c249bfb772de56e069db1c6ed48b316b400c824',
    sourceFileSha256: 'bec2b864714346ea70f1f4a0904bda03b6521073c069a972dc9e19ee6e817df9',
    pageCount: 41,
  },
  13: {
    chapter: 13,
    paths: [
      'source-transcripts/chapter-13.part-1.b64',
      'source-transcripts/chapter-13.part-2.b64',
      'source-transcripts/chapter-13.part-3.b64',
    ],
    gzipSha256: '2a25aab8f1fd302ab54bc75ba4582fb1b1c710812b80987c361e40f279ea1e30',
    sourceFileSha256: '0916d32534b1842c291c4a51fc1e26e4581fcb5504f7626e49717dba88256e9a',
    pageCount: 24,
  },
};

const transcriptCache = new Map<SourceTranscriptChapter, Promise<SourcePageTranscriptCollection>>();

export const sourcePageToPrintedPage = (chapter: SourceTranscriptChapter, sourcePage: number) => {
  if (chapter === 13 && sourcePage >= 1 && sourcePage <= 24) return sourcePage + 303;
  if (chapter === 7 && sourcePage >= 1 && sourcePage <= 41) return sourcePage + 257;
  return sourcePage;
};

const transcriptUrl = (path: string) => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}${path}`;
};

const decodeBase64 = (value: string) => {
  const binary = atob(value.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const sha256Hex = async (bytes: Uint8Array<ArrayBuffer>) => {
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot verify source transcript fingerprints');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

export const loadSourceTranscript = (chapter: SourceTranscriptChapter) => {
  const cached = transcriptCache.get(chapter);
  if (cached) return cached;

  const meta = SOURCE_TRANSCRIPT_BUNDLES[chapter];
  const pending = (async () => {
    const partTexts = await Promise.all(meta.paths.map(async path => {
      const response = await fetch(transcriptUrl(path));
      if (!response.ok) throw new Error(`Source transcript request failed for ${path} (${response.status})`);
      return response.text();
    }));
    const compressed = decodeBase64(partTexts.join(''));
    const actualGzipSha256 = await sha256Hex(compressed);
    if (actualGzipSha256 !== meta.gzipSha256) {
      throw new Error(`Source transcript bundle fingerprint mismatch for Chapter ${chapter}`);
    }
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open gzip source transcripts');

    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const collection = await new Response(stream).json() as SourcePageTranscriptCollection;
    if (collection.pageCount !== meta.pageCount || collection.pages.length !== meta.pageCount) {
      throw new Error(`Source transcript page-count mismatch for Chapter ${chapter}`);
    }
    if (collection.sourceFileSha256 !== meta.sourceFileSha256) {
      throw new Error(`Source transcript file fingerprint mismatch for Chapter ${chapter}`);
    }
    return collection;
  })();

  transcriptCache.set(chapter, pending);
  pending.catch(() => transcriptCache.delete(chapter));
  return pending;
};
