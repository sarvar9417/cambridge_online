import type { ExtractedQuestion } from './ingestion-contract.js';

export const SOURCE_VISUAL_MISSING_ISSUE = 'source_visual_required_but_missing';

const SOURCE_VISUAL_PATTERNS = [
  /\bfollowing\s+(?:logic\s+)?circuit\b/i,
  /(?:^|[.!?]\s+|\n)\s*(?:a|the|this)\s+logic\s+circuit\s+(?:is\s+)?shown\b/im,
  /(?:^|[.!?]\s+|\n)\s*(?:a|the|this)\s+logic\s+circuit\s+(?:below\s+)?(?:shows|represents)\b/im,
  /\bcircuit\s+shown\s+(?:below|above)\b/i,
  /\bfollowing\s+diagram\b/i,
  /\bdiagram\s+(?:is\s+)?shown\b/i,
  /\bdiagram\s+(?:below\s+)?(?:shows|represents)\b/i,
  /\bdiagram\s+(?:below|above)\b/i,
  /\bshown\s+in\s+(?:the\s+)?(?:diagram|figure)\b/i,
  /\busing\s+(?:the\s+)?(?:diagram|figure)\b/i,
  /\bfigure\s+\d+(?:\.\d+)?\s+(?:shows|is\s+shown|represents)\b/i,
  /\bfollowing\s+flowchart\b/i,
  /\bflowchart\s+(?:is\s+)?shown\b/i,
  /\bflowchart\s+(?:below\s+)?(?:shows|represents)\b/i,
  /\bflowchart\s+(?:below|above)\b/i,
  /\busing\s+(?:the\s+)?flowchart\b/i,
  /\bfollowing\s+graph\b/i,
  /\bgraph\s+(?:is\s+)?shown\b/i,
  /\bgraph\s+(?:below\s+)?(?:shows|represents)\b/i,
  /\bgraph\s+(?:below|above)\b/i,
  /\busing\s+(?:the\s+)?graph\b/i,
  /\b(?:network|tree)\s+(?:diagram\s+)?(?:below\s+)?(?:shows|represents|is\s+shown)\b/i,
  /\bfollowing\s+(?:bitmap\s+)?image\b/i,
  /\bimage\s+(?:is\s+)?shown\b/i,
  /\bimage\s+shown\s+(?:below|above)\b/i,
  /\bcomplete\s+(?:the\s+)?(?:following\s+)?(?:diagram|flowchart|logic\s+circuit)\b/i,
  /\bcomplete\s+(?:the\s+)?(?:e-?r|entity[- ]relationship)\s+diagram\b/i,
] as const;

export function requiresSourceVisual(stemMd: string | null, contextMd: string | null = null) {
  const text = `${stemMd ?? ''}\n${contextMd ?? ''}`;
  return SOURCE_VISUAL_PATTERNS.some((pattern) => pattern.test(text));
}

function isRenderableVisual(question: ExtractedQuestion) {
  return question.assets.some((asset) =>
    (asset.kind === 'diagram' || asset.kind === 'image') &&
    (Boolean(asset.contentMd?.trim()) || Boolean(asset.page && asset.bbox)),
  );
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
 * without a printed diagram. Only explicit source-reference language triggers
 * this gate. The pattern set intentionally covers Cambridge wording such as
 * "This flowchart represents..." and "The diagram below shows...", which older
 * extraction flattened without triggering the narrower "is shown" checks.
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
