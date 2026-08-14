import { createWriteStream } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Downloads a source PDF to local disk.
 *
 * poppler works on files, not streams, and a paper is tens of megabytes, so it
 * is fetched once per run and the stages after PREPARE work from the rendered
 * pages rather than the PDF.
 *
 * A `storagePath` that is already a local file is used as-is, which is what the
 * `papers/` directory and the regression harness rely on.
 */
export async function fetchPdfFromStorage(storagePath: string): Promise<string> {
  if (!storagePath.includes('://') && !process.env.S3_BUCKET) return storagePath;

  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET is required to fetch a source paper');

  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    },
  });

  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storagePath }));
  if (!response.Body) throw new Error(`storage object ${storagePath} has no body`);

  const dir = await mkdtemp(join(tmpdir(), 'campath-pdf-'));
  const target = join(dir, basename(storagePath));
  await pipeline(response.Body as Readable, createWriteStream(target));
  return target;
}

/**
 * Stores a cropped asset and returns the key to record on the row.
 *
 * Falls back to the local key when object storage is unconfigured, so a
 * developer run still produces crops on disk and V11 still has a size to check.
 */
export async function putAssetToStorage(key: string, bytes: Buffer): Promise<string> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) return key;

  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    },
  });

  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: 'image/png' }),
  );
  return key;
}
