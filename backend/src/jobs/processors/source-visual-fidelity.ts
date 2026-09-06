import type { ExtractedQuestion } from './ingestion-contract.js';

export const SOURCE_VISUAL_MISSING_ISSUE = 'source_visual_required_but_missing';

const SOURCE_VISUAL_PATTERNS = [
  /\bfollowing\s+(?:logic\s+)?circuit\b/i,
  /(?:^|[.!?]\s+|\n)\s*(?:a|the)\s+logic\s+circuit\s+(?:is\s+)?shown\b/im,
  /\bcircuit\s+shown\s+(?:below|above)\b/i,
  /\bfollowing\s+diagram\b/i,
  /\bdiagram\s+(?:is\s+)?shown\b/i,
  /\bdiagram\s+(?:shows|represents)\b/i,
  /\bdiagram\s+shown\s+(?:below|above)\b/i,
  /\bshown\s+in\s+(?:the\s+)?(?:diagram|figure)\b/i,
  /\bfigure\s+\d+(?:\.\d+)?\s+(?:shows|is\s+shown)\b/i,
  /\bfollowing\s+flowchart\b/i,
  /\bflowchart\s+(?:is\s+)?shown\b/i,
  /\bflowchart\s+shown\s+(?:below|above)\b/i,
  /\bcomplete\b[^.\n]{0,80}\bflowchart\b/i,
  /\bfollowing\s+graph\b/i,
  /\bgraph\s+(?:is\s+)?shown\b/i,
  /\bgraph\s+shown\s+(?:below|above)\b/i,
  /\bfollowing\s+(?:bitmap\s+)?image\b/i,
  /\bimage\s+(?:is\s+)?shown\b/i,
  /\bimage\s+shown\s+(?:below|above)\b/i,
  /\bcomplete\s+(?:the\s+)?(?:following\s+)?(?:diagram|logic\s+circuit)\b/i,
  /\bcomplete\s+(?:the\s+)?(?:e-?r|entity[- ]relationship)\s+diagram\b/i,
  /\bcomplete\s+(?:the\s+)?(?:class|state.{0,3}transition)\s+diagram\b/i,
  /\bcomplete\s+(?:the\s+)?binary\s+tree\b/i,
  /\bstate.{0,3}transition\s+diagram\b/i,
  /\bstructure\s+chart\b/i,
  /\bsyntax\s+diagrams?\b/i,
  /\bcurrent\s+state\s+of\s+the\s+stack\b/i,
] as const;

export function requiresSourceVisual(stemMd: string | null, contextMd: string | null = null) {
  const text = `${stemMd ?? ''}\n${contextMd ?? ''}`;
  return SOURCE_VISUAL_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Text that merely describes a diagram is not the diagram. A DB-resident visual
 * is faithful only when it is actual SVG markup; otherwise the ingestion record
 * must point to a crop region so the source page can be materialized exactly.
 */
export function isFaithfulVisualAsset(asset: ExtractedQuestion['assets'][number]) {
  if (asset.kind !== 'diagram' && asset.kind !== 'image') return false;
  const inlineSvg = /^\s*<svg(?:\s|>)/i.test(asset.contentMd ?? '');
  const cropReady = Boolean(asset.page && asset.bbox);
  return inlineSvg || cropReady;
}

function isRenderableVisual(question: ExtractedQuestion) {
  return question.assets.some(isFaithfulVisualAsset);
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
 * A source visual is part of the question prompt, not the candidate response.
 * The visual may live on the leaf or any printed ancestor/context node.
 *
 * This deliberately does not treat answerKind='diagram' as evidence that a
 * source visual is required: "Draw a logic circuit ..." can be fully answerable
 * without a printed diagram. Only source-reference/layout language triggers
 * this gate.
 */
export function enforceSourceVisualFidelity(questions: ExtractedQuestion[]) {
  const byPath = new Map(questions.map((question) => [question.path, question]));
  return questions.map((question) => {
    if (!requiresSourceVisual(question.stemMd, question.contextMd)) return question;
    const hasVisual = ancestorChain(question, byPath).some(isRenderableVisual);
    if (hasVisual) return question;
    return {
      ...question,
      confidence: Math.min(question.confidence, 0.79),
      issues: [...new Set([...question.issues, SOURCE_VISUAL_MISSING_ISSUE])],
    };
  });
}
