export const VISUAL_ASSET_KINDS_SQL = "('diagram','image')";

const DIRECT_SVG_SQL = String.raw`^\\s*(<\\?xml[^>]*\\?>\\s*)?<svg(?:\\s|>)`;
const FENCED_SVG_SQL = String.raw`^\\s*\`\`\`(?:svg|xml)\\s*[\\r\\n]+(<\\?xml[^>]*\\?>\\s*)?<svg(?:\\s|>)`;

export function visualAssetSql(alias = 'qa') {
  return `${alias}.kind in ${VISUAL_ASSET_KINDS_SQL}`;
}

/**
 * SQL predicate for a visual that the browser can actually render.
 *
 * A row merely having kind=diagram/image is not enough. Production has legacy
 * rows where the visual body is absent or only prose. Renderable source must be
 * one of:
 * - a storage object,
 * - direct (optionally XML-prefixed) SVG in content_md,
 * - fenced svg/xml source in content_md,
 * - direct (optionally XML-prefixed) SVG in svg_markup.
 */
export function renderableVisualAssetSql(alias = 'qa') {
  return `(
    ${visualAssetSql(alias)}
    and (
      nullif(btrim(coalesce(${alias}.storage_path,'')),'') is not null
      or coalesce(${alias}.content_md,'') ~* '${DIRECT_SVG_SQL}'
      or coalesce(${alias}.content_md,'') ~* '${FENCED_SVG_SQL}'
      or coalesce(${alias}.svg_markup,'') ~* '${DIRECT_SVG_SQL}'
    )
  )`;
}

export function unrenderableVisualAssetSql(alias = 'qa') {
  return `(${visualAssetSql(alias)} and not ${renderableVisualAssetSql(alias)})`;
}

export type SourceVisualAssetRecord = {
  kind?: unknown;
  storagePath?: unknown;
  contentMd?: unknown;
  svgMarkup?: unknown;
};

function inlineSvg(value: unknown) {
  if (typeof value !== 'string') return false;
  let candidate = value.replace(/^\uFEFF/, '').trim();
  const fenced = candidate.match(/^\`\`\`(?:svg|xml)\s*\r?\n([\s\S]*?)\r?\n\`\`\`\s*$/i);
  if (fenced) candidate = fenced[1]!.trim();
  candidate = candidate.replace(/^<\?xml[^>]*\?>\s*/i, '');
  return /^<svg(?:\s|>)/i.test(candidate) && /<\/svg>\s*$/i.test(candidate);
}

export function sourceVisualAssetRenderable(asset: SourceVisualAssetRecord) {
  if (asset.kind !== 'diagram' && asset.kind !== 'image') return false;
  if (typeof asset.storagePath === 'string' && asset.storagePath.trim()) return true;
  return inlineSvg(asset.contentMd) || inlineSvg(asset.svgMarkup);
}
