import type { ExportContextBlock, ExportQuestion } from './export-html.js';
import { safeParseStructuredQuestionContent,type StructuredQuestionContent } from './structured-question-content.js';

type Row = Record<string, unknown>;
type Snapshot = {
  leaf?: { stem?: unknown;contentJson?:unknown };
  contextBlocks?: unknown;
};

function snapshot(value: unknown): Snapshot | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Snapshot; } catch { return null; }
  }
  return typeof value === 'object' ? value as Snapshot : null;
}

function structuredContent(value:unknown):StructuredQuestionContent|null {
  if(value===null||value===undefined)return null;
  const parsed=safeParseStructuredQuestionContent(value);
  if(!parsed.success)throw new Error('export_structured_content_invalid');
  return parsed.data;
}

function contextBlocks(value: unknown): ExportContextBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').map((block) => ({
    displayRef: typeof block.displayRef === 'string' ? block.displayRef : undefined,
    context: typeof block.context === 'string' ? block.context : null,
    assets: Array.isArray(block.assets)
      ? block.assets.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').map((asset) => ({
          id: typeof asset.id === 'string' ? asset.id : undefined,
          kind: typeof asset.kind === 'string' ? asset.kind : 'asset',
          contentMd: typeof asset.contentMd === 'string' ? asset.contentMd : null,
          storagePath: typeof asset.storagePath === 'string' ? asset.storagePath : null,
          altText: typeof asset.altText === 'string' ? asset.altText : null,
          sourcePage: typeof asset.sourcePage === 'number' ? asset.sourcePage : null,
          cropStatus: typeof asset.cropStatus === 'string' ? asset.cropStatus : null,
        }))
      : [],
  }));
}

function schemeAssets(value: unknown): NonNullable<ExportQuestion['schemeAssets']> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const asset=item as Record<string,unknown>;
    if (
      typeof asset.id!=='string' ||
      typeof asset.kind!=='string' ||
      typeof asset.contentMd!=='string' ||
      typeof asset.altText!=='string' ||
      typeof asset.sourcePage!=='number'
    ) return [];
    return [{
      id:asset.id,
      kind:asset.kind,
      contentMd:asset.contentMd,
      altText:asset.altText,
      sourcePage:asset.sourcePage,
      sourceSha256:typeof asset.sourceSha256==='string'?asset.sourceSha256:null,
    }];
  });
}

/** Convert one unioned assignment/context DB row into the stable PDF/DOCX model. */
export function toAssignmentExportQuestion(row: Row): ExportQuestion {
  const frozen = snapshot(row.portable_snapshot);
  const blocks = contextBlocks(frozen?.contextBlocks);
  const role = row.role === 'context_only' ? 'context_only' : 'graded';
  const frozenStem = frozen?.leaf && typeof frozen.leaf.stem === 'string' ? frozen.leaf.stem : null;
  const frozenContent=frozen?.leaf?.contentJson===undefined?null:structuredContent(frozen.leaf.contentJson);
  const liveContent=structuredContent(row.content_json);
  return {
    displayRef: String(row.fresh_ref ?? row.display_ref ?? ''),
    sourceRef: String(row.source_ref ?? row.display_ref ?? ''),
    stem: frozenStem ?? String(row.stem_md ?? ''),
    contentJson:frozenContent??liveContent,
    context: blocks.length ? undefined : (typeof row.context_md === 'string' ? row.context_md : undefined),
    contextBlocks: blocks.length ? blocks : undefined,
    marks: role === 'context_only' ? 0 : Number(row.marks ?? 0),
    role,
    schemeStatus: role==='graded'&&typeof row.scheme_status==='string'?row.scheme_status:undefined,
    schemeGuidance: role==='graded'&&typeof row.scheme_guidance==='string'?row.scheme_guidance:null,
    schemeAssets: role==='graded'?schemeAssets(row.scheme_assets):[],
    points: role==='graded'&&Array.isArray(row.points) ? row.points as ExportQuestion['points'] : [],
  };
}
