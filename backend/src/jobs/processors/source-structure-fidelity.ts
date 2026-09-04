import type { ExtractedQuestion } from './ingestion-contract.js';

export type SourceStructureKind = 'table' | 'layout';
export const SOURCE_STRUCTURE_MISSING_PREFIX = 'source_structure_required_but_missing:';

const TABLE_PATTERNS = [
  /\bcomplete\s+(?:(?:the|this|following)\s+)?(?:truth\s+|trace\s+|identifier\s+)?table\b/i,
  /\bfill\s+in\s+(?:(?:the|this|following)\s+)?(?:truth\s+|trace\s+|identifier\s+)?table\b/i,
  /\bput\s+(?:one\s+)?tick\b[\s\S]{0,220}\beach\s+row\b/i,
  /\beach\s+row\b[\s\S]{0,220}\b(?:one\s+)?tick\b/i,
  /\bselect\s+(?:one\s+)?(?:box|column)\b[\s\S]{0,160}\beach\s+row\b/i,
  /\btick\b[\s\S]{0,180}\b(?:table|row|column|box)\b/i,
  /\b(?:following|given|provided)\s+(?:truth\s+|trace\s+|identifier\s+)?table\b/i,
  /\b(?:truth|trace|identifier)\s+table\b/i,
  /\btable\s+(?:below|above|provided|given|shows|showing|contains|lists|represents)\b/i,
  /\b(?:answers?|results?)\b[\s\S]{0,140}\btable\s+provided\b/i,
  /\b(?:karnaugh\s+map|k-?map)\b/i,
] as const;

const LAYOUT_PATTERNS = [
  /\bmatch\s+each\b/i,
  /\bdraw\s+(?:a\s+)?line\b[\s\S]{0,180}\b(?:match|connect)\b/i,
  /\bdraw\s+lines?\b[\s\S]{0,180}\b(?:match|connect)\b/i,
  /\bjoin\s+each\b[\s\S]{0,180}\b(?:correct|matching)\b/i,
  /\bconnect\s+each\b/i,
] as const;

export function requiredSourceStructures(stemMd: string | null, contextMd: string | null = null): SourceStructureKind[] {
  const text = `${contextMd ?? ''}\n${stemMd ?? ''}`;
  const required = new Set<SourceStructureKind>();
  if (TABLE_PATTERNS.some((pattern) => pattern.test(text))) required.add('table');
  if (LAYOUT_PATTERNS.some((pattern) => pattern.test(text))) required.add('layout');
  return [...required];
}

function hasRenderableAsset(question: ExtractedQuestion, kind: SourceStructureKind) {
  return question.assets.some((asset) => {
    const hasContent = Boolean(asset.contentMd?.trim());
    const hasCrop = Boolean(asset.page && asset.bbox);
    const visual = asset.kind === 'diagram' || asset.kind === 'image';
    if (kind === 'table') return (asset.kind === 'table' && hasContent) || (visual && (hasContent || hasCrop));
    return (asset.kind === 'table' && hasContent) || (visual && (hasContent || hasCrop));
  });
}

function ancestorChain(question: ExtractedQuestion, byPath: Map<string, ExtractedQuestion>) {
  const chain: ExtractedQuestion[] = [question];
  const seen = new Set([question.path]);
  let parentPath = question.parentPath;
  while (parentPath && !seen.has(parentPath)) {
    seen.add(parentPath);
    const parent = byPath.get(parentPath);
    if (!parent) break;
    chain.push(parent);
    parentPath = parent.parentPath;
  }
  return chain;
}

/**
 * Preserve source layouts that carry answer semantics. A table/tick grid/matching
 * layout may live on the leaf or an ancestor context node. We accept either a
 * semantic table transcription or a source-faithful visual crop; plain text is
 * deliberately not sufficient because column/row relationships are meaningful.
 *
 * `answerKind=table` is itself a fail-closed signal. Older corpus extraction can
 * correctly identify that the candidate responds in a table while still losing
 * the printed grid during text flattening; requiring an asset here prevents that
 * class of regression even when the wording uses an uncommon Cambridge phrase.
 */
export function enforceSourceStructureFidelity(questions: ExtractedQuestion[]) {
  const byPath = new Map(questions.map((question) => [question.path, question]));
  return questions.map((question) => {
    const required = new Set(requiredSourceStructures(question.stemMd, question.contextMd));
    if (question.answerKind === 'table') required.add('table');
    if (!required.size) return question;
    const chain = ancestorChain(question, byPath);
    const missing = [...required].filter((kind) => !chain.some((node) => hasRenderableAsset(node, kind)));
    if (!missing.length) return question;
    return {
      ...question,
      confidence: Math.min(question.confidence, 0.79),
      issues: [
        ...new Set([
          ...question.issues,
          ...missing.map((kind) => `${SOURCE_STRUCTURE_MISSING_PREFIX}${kind}`),
        ]),
      ],
    };
  });
}
