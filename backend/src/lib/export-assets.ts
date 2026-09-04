import type { AssetUrlSigner } from '../jobs/asset-store.js';
import type { ExportAsset, ExportQuestion } from './export-html.js';

type FetchLike=typeof fetch;

function pngSize(bytes:Uint8Array){
  if(bytes.length<24||bytes[0]!==0x89||bytes[1]!==0x50||bytes[2]!==0x4e||bytes[3]!==0x47)throw new Error('export_asset_not_png');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const width=view.getUint32(16),height=view.getUint32(20);
  if(!width||!height||width>20000||height>20000)throw new Error('export_asset_png_dimensions_invalid');
  return{width,height};
}

function xml(value:string){return value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}

function pngAsSvg(bytes:Uint8Array,alt:string){
  const{width,height}=pngSize(bytes);
  const encoded=Buffer.from(bytes).toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xml(alt)}"><image href="data:image/png;base64,${encoded}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

async function materializeAsset(asset:ExportAsset,signer:AssetUrlSigner|undefined,fetchImpl:FetchLike){
  if(asset.contentMd||!asset.storagePath)return asset;
  if(!signer)throw new Error(`export_asset_storage_unavailable:${asset.altText??asset.kind}`);
  const url=await signer.signStoragePath(asset.storagePath,300);
  if(!url)throw new Error(`export_asset_storage_path_invalid:${asset.altText??asset.kind}`);
  const response=await fetchImpl(url);
  if(!response.ok)throw new Error(`export_asset_download_failed:${response.status}:${asset.altText??asset.kind}`);
  const type=(response.headers.get('content-type')??'').toLowerCase();
  if(type&&!type.includes('image/png')&&!type.includes('application/octet-stream'))throw new Error(`export_asset_content_type_unsupported:${type}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength>8_000_000)throw new Error('export_asset_too_large');
  return{...asset,contentMd:pngAsSvg(bytes,asset.altText??asset.kind)};
}

/**
 * Resolve private source crops only at export time. Portable snapshots keep the
 * canonical storage path, never a long-lived signed URL. The resulting SVG is
 * self-contained and can be consumed by both the PDF HTML renderer and the
 * DOCX DrawingML path.
 */
export async function materializeExportAssets(
  questions:ExportQuestion[],
  signer?:AssetUrlSigner,
  fetchImpl:FetchLike=fetch,
):Promise<ExportQuestion[]>{
  return Promise.all(questions.map(async question=>({
    ...question,
    contextBlocks:question.contextBlocks?await Promise.all(question.contextBlocks.map(async block=>({
      ...block,
      assets:block.assets?await Promise.all(block.assets.map(asset=>materializeAsset(asset,signer,fetchImpl))):block.assets,
    }))):question.contextBlocks,
  })));
}
