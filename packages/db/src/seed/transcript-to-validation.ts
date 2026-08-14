import type { ValidationContext, ValidationQuestion, ValidationScheme } from '@campath/shared';
import type { SeedLeaf, SeedNode } from './paper-9618-s23-11.js';

type SeedItem = SeedNode | SeedLeaf;

const isNode = (item: SeedItem): item is SeedNode => 'children' in item;

/** Depth-first walk of a transcript: a paper is an array of root questions. */
export function flatten(roots: SeedNode[]): SeedItem[] {
  const out: SeedItem[] = [];
  const push = (item: SeedItem) => {
    out.push(item);
    if (isNode(item)) for (const child of item.children) push(child);
  };
  for (const root of roots) push(root);
  return out;
}

const parentOf = (path: string) =>
  path.includes('.') ? path.slice(0, path.lastIndexOf('.')) : null;

/**
 * Adapts a hand-transcribed paper into the shape the validator consumes.
 *
 * This is what makes the 23 rules testable against real Cambridge content
 * before the model pipeline can run: the transcripts are the same papers, read
 * by a human instead of by a model.
 *
 * Transcripts carry no extraction confidence — a human read them — so the
 * confidence-based rules are given a value that passes rather than a fake score
 * that would make V18 meaningless.
 */
export function transcriptToValidationContext(input: {
  papers: SeedNode[][];
  componentTotalMarks: number;
  year: number;
  subtopicConfidence?: number;
}): ValidationContext {
  const items = input.papers.flatMap((paper) => flatten(paper));
  const confidence = input.subtopicConfidence ?? 0.95;

  const questions: ValidationQuestion[] = items.map((item) => {
    const leaf = !isNode(item);
    const subtopics = (item.subtopics ?? []).map((code, index, all) => ({
      code,
      confidence,
      // Transcripts record which subtopics apply but not how to split them;
      // an even split is the honest default and keeps V21 meaningful.
      weight: Number((1 / all.length).toFixed(2)),
      isPrimary: index === 0,
    }));

    return {
      path: item.path,
      parentPath: parentOf(item.path),
      displayRef: isNode(item) ? item.displayRef : item.path,
      marks: leaf ? (item as SeedLeaf).marks : null,
      stemMd: leaf ? (item as SeedLeaf).stemLatex : null,
      contextMd: item.contextLatex ?? null,
      commandWord: leaf ? (item as SeedLeaf).command : null,
      answerKind: leaf ? ((item as SeedLeaf).answerKind ?? 'text') : 'text',
      answerLines: leaf ? ((item as SeedLeaf).answerLines ?? null) : null,
      extractConfidence: 1,
      subtopics,
    };
  });

  // Even weights rarely land on exactly 1.00 for three subtopics; nudge the
  // primary so the split is exact rather than reporting a rounding artefact.
  for (const question of questions) {
    if (question.subtopics.length < 2) continue;
    const sum = question.subtopics.reduce((total, item) => total + item.weight, 0);
    const primary = question.subtopics[0]!;
    primary.weight = Number((primary.weight + (1 - sum)).toFixed(2));
  }

  const schemes: ValidationScheme[] = items
    .filter((item): item is SeedLeaf => !isNode(item))
    .map((leaf) => ({
      questionPath: leaf.path,
      type: leaf.scheme.type,
      maxMarks: leaf.scheme.maxMarks,
      points: leaf.scheme.points.map((point) => ({
        code: point.code,
        marks: point.marks ?? 1,
        groupLabel: point.groupLabel ?? null,
      })),
      groups: leaf.scheme.groups ?? [],
      levelCount: 0,
      confidence: 1,
    }));

  return {
    componentTotalMarks: input.componentTotalMarks,
    year: input.year,
    questions,
    schemes,
    assets: [],
    dependencies: [],
  };
}
