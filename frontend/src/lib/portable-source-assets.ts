import type {
  SourceLocation,
  StructuredQuestionBlock,
  StructuredQuestionContent,
} from './structured-question-content';

export type PortableSourceAsset = {
  id: string;
  kind?: string | null;
  url?: string | null;
  contentMd?: string | null;
  altText?: string | null;
  sourcePage?: number | null;
};

type TableBlock = Extract<StructuredQuestionBlock, { type:'table' }>;
type AssetBlock = Extract<StructuredQuestionBlock, { type:'asset' }>;
type CodeBlock = Extract<StructuredQuestionBlock, { type:'code' }>;

export function isFaithfulInlineSvg(value: string | null | undefined) {
  return /^\s*<svg(?:\s|>)/i.test(value ?? '');
}

export function portableAssetUrl(asset: PortableSourceAsset | undefined) {
  if (!asset) return null;
  if (asset.url) return asset.url;
  if (!isFaithfulInlineSvg(asset.contentMd)) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.contentMd!)}`;
}

function pipeCells(line: string) {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return [];
  const body = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return body.split('|').map((cell) => cell.trim());
}

function separatorRow(cells: string[]) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function tableKind(asset: PortableSourceAsset): TableBlock['kind'] {
  const label = `${asset.altText ?? ''}\n${asset.contentMd ?? ''}`.toLowerCase();
  if (label.includes('truth table')) return 'truth_table';
  if (label.includes('tick') || label.includes('checkbox')) return 'tick_grid';
  if (label.includes('selection') || label.includes('select one')) return 'selection_grid';
  return 'table';
}

/**
 * Parse the semantic table form already stored in question_assets.content_md.
 *
 * Historical repairs contain both ordinary Markdown tables (with a --- header
 * separator) and source grids with only pipe-delimited rows. The latter are
 * still structured data and must not be forced through an image URL that does
 * not exist.
 */
export function portableTableBlock(
  asset: PortableSourceAsset,
  source: SourceLocation,
): TableBlock | null {
  const lines = (asset.contentMd ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes('|'));
  const parsed = lines.map(pipeCells).filter((cells) => cells.length > 1);
  if (!parsed.length) return null;

  let headers: string[] = [];
  let rows = parsed;
  if (parsed.length >= 2 && separatorRow(parsed[1]!)) {
    headers = parsed[0]!;
    rows = parsed.slice(2);
  }
  rows = rows.filter((row) => !separatorRow(row));
  if (!rows.length && headers.length) rows = [headers.map(() => '')];
  if (!rows.length) return null;

  const width = Math.max(headers.length, ...rows.map((row) => row.length));
  if (width < 2) return null;
  headers = headers.length ? [...headers, ...Array(Math.max(0, width - headers.length)).fill('')] : [];
  const normalizedRows = rows.map((row) => [
    ...row.map((cell) => cell === '' ? null : cell),
    ...Array(Math.max(0, width - row.length)).fill(null),
  ] as Array<string | null>);
  const editableCells: Array<[number, number]> = [];
  normalizedRows.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    if (cell === null) editableCells.push([rowIndex, columnIndex]);
  }));

  return {
    type: 'table',
    kind: tableKind(asset),
    headers,
    rows: normalizedRows,
    editableCells,
    source,
  };
}

function codeBlock(asset: PortableSourceAsset, source: SourceLocation): CodeBlock | null {
  const text = asset.contentMd?.trim();
  if (!text) return null;
  const fenced = text.match(/^```([^\n]*)\n([\s\S]*?)\n```$/);
  return {
    type: 'code',
    language: fenced?.[1]?.trim() || null,
    text: (fenced?.[2] ?? text).trim(),
    source,
  };
}

function assetMap(assets: PortableSourceAsset[]) {
  return new Map(assets.filter((asset) => asset.id).map((asset) => [asset.id, asset] as const));
}

/**
 * Compatibility bridge for canonical v1 rows produced before table/code blocks
 * were consistently backfilled. The original asset id remains in the database;
 * only the browser representation is upgraded for rendering.
 */
export function materializePortableSourceAssets(
  content: StructuredQuestionContent,
  assets: PortableSourceAsset[],
): StructuredQuestionContent {
  const byId = assetMap(assets);
  let changed = false;
  const blocks = content.blocks.map((block): StructuredQuestionBlock => {
    if (block.type !== 'asset') return block;
    const asset = byId.get(block.assetId);
    if (!asset) return block;
    if (asset.kind === 'table') {
      const table = portableTableBlock(asset, block.source);
      if (table) { changed = true; return table; }
    }
    if (asset.kind === 'pseudocode' || asset.kind === 'code') {
      const code = codeBlock(asset, block.source);
      if (code) { changed = true; return code; }
    }
    return block;
  });
  return changed ? { ...content, blocks } : content;
}

export function portableAssetsForContent(assets: PortableSourceAsset[]) {
  const urls: Record<string, string> = {};
  for (const asset of assets) {
    const url = portableAssetUrl(asset);
    if (asset.id && url) urls[asset.id] = url;
  }
  return urls;
}

export function unresolvedVisualAsset(
  content: StructuredQuestionContent,
  urls: Record<string, string>,
): AssetBlock | undefined {
  return content.blocks.find((block): block is AssetBlock => block.type === 'asset' && !urls[block.assetId]);
}
