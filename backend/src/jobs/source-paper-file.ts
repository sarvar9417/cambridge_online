import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const MAX_SOURCE_PDF_BYTES = 25 * 1024 * 1024;

export interface SourcePaperLocation {
  storagePath?: string | null;
  sourceUrl?: string | null;
  sha256: string;
}

export interface MaterializedSourcePdf {
  sourcePath: string;
  mode: 'local' | 'remote' | 'cache';
}

type FetchLike = typeof fetch;

export function normalizeRemoteSourceUrl(raw: string) {
  const input = raw.trim();
  const parsed = new URL(input);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('ingestion_source_url_protocol');
  }

  if (parsed.hostname === 'drive.google.com') {
    const fileMatch = parsed.pathname.match(/^\/file\/d\/([^/]+)/);
    const id = fileMatch?.[1] ?? parsed.searchParams.get('id');
    if (!id) throw new Error('ingestion_google_drive_file_id_missing');
    const direct = new URL('https://drive.usercontent.google.com/download');
    direct.searchParams.set('id', id);
    direct.searchParams.set('export', 'download');
    direct.searchParams.set('confirm', 't');
    return direct.toString();
  }

  return parsed.toString();
}

export async function materializeSourcePdf(
  paper: SourcePaperLocation,
  cacheDir: string,
  fetchImpl: FetchLike = fetch,
): Promise<MaterializedSourcePdf> {
  const expectedSha = normalizeSha(paper.sha256);
  await mkdir(cacheDir, { recursive: true });
  const cached = join(cacheDir, 'source.pdf');

  if (await isValidExisting(cached, expectedSha)) {
    return { sourcePath: cached, mode: 'cache' };
  }

  if (paper.sourceUrl?.trim()) {
    const sourceUrl = normalizeRemoteSourceUrl(paper.sourceUrl);
    const response = await fetchImpl(sourceUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
      headers: { 'user-agent': 'CambridgeOnlineCorpusWorker/1.0' },
    });
    if (!response.ok) throw new Error(`ingestion_source_download_http:${response.status}`);

    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > MAX_SOURCE_PDF_BYTES) throw new Error('ingestion_source_download_too_large');

    const bytes = Buffer.from(await response.arrayBuffer());
    validatePdfBytes(bytes, expectedSha);
    const temporary = `${cached}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(temporary, bytes);
    await rename(temporary, cached);
    return { sourcePath: cached, mode: 'remote' };
  }

  if (!paper.storagePath?.trim()) throw new Error('ingestion_source_location_missing');
  const localPath = resolve(paper.storagePath);
  const info = await stat(localPath);
  if (!info.isFile()) throw new Error('ingestion_source_local_not_file');
  if (info.size > MAX_SOURCE_PDF_BYTES) throw new Error('ingestion_source_download_too_large');
  const bytes = await readFile(localPath);
  validatePdfBytes(bytes, expectedSha);
  return { sourcePath: localPath, mode: 'local' };
}

async function isValidExisting(path: string, expectedSha: string) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size > MAX_SOURCE_PDF_BYTES) return false;
    const bytes = await readFile(path);
    validatePdfBytes(bytes, expectedSha);
    return true;
  } catch {
    return false;
  }
}

function validatePdfBytes(bytes: Buffer, expectedSha: string) {
  if (!bytes.length || bytes.length > MAX_SOURCE_PDF_BYTES) throw new Error('ingestion_source_download_too_large');
  if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('ingestion_source_download_not_pdf');
  }
  const actualSha = createHash('sha256').update(bytes).digest('hex');
  if (actualSha !== expectedSha) throw new Error(`ingestion_source_sha_mismatch:${actualSha}`);
}

function normalizeSha(value: string) {
  const sha = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha)) throw new Error('ingestion_source_sha_invalid');
  return sha;
}
