import type { AssetUrlSigner } from '../jobs/asset-store.js';
import type { ExportQuestion } from './export-html.js';

type FetchLike = typeof fetch;

function pngSize(bytes: Uint8Array) {
  if (bytes.length < 24
    || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47
    || bytes[4] !== 0x0d || bytes[5] !== 0x0a || bytes[6] !== 0x1a || bytes[7] !== 0x0a) {
    throw new Error('export_asset_not_png');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (!width || !height || width > 10000 || height > 10000) throw new Error('export_asset_png_dimensions_invalid');
  return { width, height };
}

export function pngBytesToInlineSvg(bytes: Uint8Array) {
  const { width, height } = pngSize(bytes);
  const encoded = Buffer.from(bytes).toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="data:image/png;base64,${encoded}"/></svg>`;
}

export async function materializeStoredExportAssets(
  questions: ExportQuestion[],
  signer: AssetUrlSigner,
  fetchImpl: FetchLike = fetch,
): Promise<ExportQuestion[]> {
  return Promise.all(questions.map(async (question) => ({
    ...question,
    contextBlocks: await Promise.all((question.contextBlocks ?? []).map(async (block) => ({
      ...block,
      assets: await Promise.all((block.assets ?? []).map(async (asset) => {
        if (!asset.storagePath || asset.contentMd) return asset;
        const url = await signer.signStoragePath(asset.storagePath, 300);
        if (!url) throw new Error(`export_asset_sign_failed:${question.sourceRef ?? question.displayRef}:${asset.altText ?? asset.kind}`);
        const response = await fetchImpl(url);
        if (!response.ok) throw new Error(`export_asset_fetch_failed:${response.status}:${question.sourceRef ?? question.displayRef}`);
        const type = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
        if (type && type !== 'image/png' && type !== 'application/octet-stream') {
          throw new Error(`export_asset_content_type_unsupported:${type}`);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!bytes.length || bytes.length > 3_000_000) throw new Error(`export_asset_size_invalid:${bytes.length}`);
        return { ...asset, contentMd: pngBytesToInlineSvg(bytes) };
      })),
    }))),
  })));
}
