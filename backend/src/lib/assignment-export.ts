import type { ExportContextBlock, ExportQuestion } from './export-html.js';

type Row = Record<string, unknown>;
type Snapshot = {
  leaf?: { stem?: unknown };
  contextBlocks?: unknown;
};

function snapshot(value: unknown): Snapshot | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Snapshot; } catch { return null; }
  }
  return typeof value === 'object' ? value as Snapshot : null;
}

function contextBlocks(value: unknown): ExportContextBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').map((block) => ({
    displayRef: typeof block.displayRef === 'string' ? block.displayRef : undefined,
    context: typeof block.context === 'string' ? block.context : null,
    assets: Array.isArray(block.assets)
      ? block.assets.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').map((asset) => ({
          kind: typeof asset.kind === 'string' ? asset.kind : 'asset',
          contentMd: typeof asset.contentMd === 'string' ? asset.contentMd : null,
          storagePath: typeof asset.storagePath === 'string' ? asset.storagePath : null,
          altText: typeof asset.altText === 'string' ? asset.altText : null,
          sourcePage: typeof asset.sourcePage === 'number' ? asset.sourcePage : null,
        }))
      : [],
  }));
}

/** Convert one unioned assignment/context DB row into the stable PDF model. */
export function toAssignmentExportQuestion(row: Row): ExportQuestion {
  const frozen = snapshot(row.portable_snapshot);
  const blocks = contextBlocks(frozen?.contextBlocks);
  const role = row.role === 'context_only' ? 'context_only' : 'graded';
  const frozenStem = frozen?.leaf && typeof frozen.leaf.stem === 'string' ? frozen.leaf.stem : null;
  return {
    displayRef: String(row.fresh_ref ?? row.display_ref ?? ''),
    sourceRef: String(row.source_ref ?? row.display_ref ?? ''),
    stem: frozenStem ?? String(row.stem_md ?? ''),
    context: blocks.length ? undefined : (typeof row.context_md === 'string' ? row.context_md : undefined),
    contextBlocks: blocks.length ? blocks : undefined,
    marks: role === 'context_only' ? 0 : Number(row.marks ?? 0),
    role,
    points: Array.isArray(row.points) ? row.points as ExportQuestion['points'] : [],
  };
}
