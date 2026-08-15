import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { materializeSourcePdf, normalizeRemoteSourceUrl } from './source-paper-file.js';

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const sha = createHash('sha256').update(pdf).digest('hex');

async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'campath-source-'));
  dirs.push(dir);
  return dir;
}

describe('remote corpus source PDFs', () => {
  it('turns a public Google Drive share URL into a direct download URL', () => {
    const url = normalizeRemoteSourceUrl('https://drive.google.com/file/d/abc_DEF-123/view?usp=sharing');
    const parsed = new URL(url);
    expect(parsed.hostname).toBe('drive.usercontent.google.com');
    expect(parsed.searchParams.get('id')).toBe('abc_DEF-123');
    expect(parsed.searchParams.get('export')).toBe('download');
  });

  it('downloads, validates and caches a remote PDF', async () => {
    const dir = await tempDir();
    const fetcher = vi.fn(async () => new Response(pdf, { status: 200, headers: { 'content-type': 'application/pdf' } }));
    const first = await materializeSourcePdf({ sourceUrl: 'https://example.com/paper.pdf', sha256: sha }, dir, fetcher as typeof fetch);
    expect(first.mode).toBe('remote');
    expect(await readFile(first.sourcePath)).toEqual(pdf);
    const second = await materializeSourcePdf({ sourceUrl: 'https://example.com/paper.pdf', sha256: sha }, dir, fetcher as typeof fetch);
    expect(second.mode).toBe('cache');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('falls back to a verified local source when no URL exists', async () => {
    const dir = await tempDir();
    const local = join(dir, 'paper.pdf');
    await writeFile(local, pdf);
    const cache = join(dir, 'cache');
    const result = await materializeSourcePdf({ storagePath: local, sha256: sha }, cache);
    expect(result).toEqual({ sourcePath: local, mode: 'local' });
  });

  it('rejects downloaded HTML even when the request succeeds', async () => {
    const dir = await tempDir();
    const fetcher = vi.fn(async () => new Response('<html>sign in</html>', { status: 200 }));
    await expect(materializeSourcePdf({ sourceUrl: 'https://example.com/paper.pdf', sha256: sha }, dir, fetcher as typeof fetch))
      .rejects.toThrow('ingestion_source_download_not_pdf');
  });

  it('rejects a source whose bytes do not match the staged SHA-256', async () => {
    const dir = await tempDir();
    const other = Buffer.from('%PDF-1.4\nchanged\n%%EOF\n');
    const fetcher = vi.fn(async () => new Response(other, { status: 200 }));
    await expect(materializeSourcePdf({ sourceUrl: 'https://example.com/paper.pdf', sha256: sha }, dir, fetcher as typeof fetch))
      .rejects.toThrow('ingestion_source_sha_mismatch');
  });
});
