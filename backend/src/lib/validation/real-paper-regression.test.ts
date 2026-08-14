import { describe, expect, it } from 'vitest';
import { validateExtraction, type ValidationInput } from './rules.js';
import {
  PAPER,
  flattenPaper,
  type SeedLeaf,
  type SeedNode,
} from './fixtures/paper-9618-s23-11.js';

type SeedItem = SeedNode | SeedLeaf;

const isNode = (item: SeedItem): item is SeedNode => 'children' in item;
const parentPath = (path: string) =>
  path.includes('.') ? path.slice(0, path.lastIndexOf('.')) : null;
const questionId = (path: string) => `fixture:${path}`;

function toValidationInput(): ValidationInput {
  const items = flattenPaper(PAPER) as SeedItem[];
  const leaves = items.filter((item): item is SeedLeaf => !isNode(item));

  return {
    componentTotal: 75,
    questions: items.map((item) => {
      const leaf = !isNode(item);
      const leafItem = leaf ? (item as SeedLeaf) : null;
      const kind = leafItem?.answerKind ?? 'text';
      return {
        id: questionId(item.path),
        path: item.path,
        parentId: parentPath(item.path) ? questionId(parentPath(item.path)!) : null,
        marks: leafItem?.marks ?? null,
        stem: leafItem?.stemLatex ?? item.contextLatex ?? `Shared context for question ${item.path}.`,
        commandWord: leafItem?.command ?? null,
        answerKind: kind,
        answerLines: leafItem?.answerLines ?? (leafItem ? leafItem.marks * 2 : null),
        assetCount: kind === 'diagram' ? 1 : 0,
        subtopicConfidences: leafItem?.subtopics.map(() => 0.95) ?? [],
        extractConfidence: 1,
      };
    }),
    schemes: leaves.map((leaf) => ({
      questionId: questionId(leaf.path),
      type: leaf.scheme.type,
      maxMarks: leaf.scheme.maxMarks,
      points: leaf.scheme.points.map((point) => point.marks ?? 1),
      nRequired: leaf.scheme.groups?.[0]?.nRequired,
      groupMaxMarks: leaf.scheme.groups?.[0]?.maxMarks,
      levels: leaf.scheme.type === 'levels_of_response' ? 1 : undefined,
    })),
    assets: leaves
      .filter((leaf) => (leaf.answerKind ?? 'text') === 'diagram')
      .map((leaf) => ({
        storagePath: `fixture://9618-s23-11/${leaf.path}.png`,
        size: 4096,
      })),
  };
}

describe('real-paper regression: 9618/11/M/J/23', () => {
  it('preserves the six root questions and a 75-mark leaf total', () => {
    expect(PAPER.map((node) => node.path)).toEqual(['1', '2', '3', '4', '5', '6']);
    const input = toValidationInput();
    const parentIds = new Set(input.questions.map((question) => question.parentId).filter(Boolean));
    const leaves = input.questions.filter((question) => !parentIds.has(question.id));
    expect(leaves.reduce((total, leaf) => total + (leaf.marks ?? 0), 0)).toBe(75);
    expect(leaves.length).toBeGreaterThan(20);
  });

  it('has a mark scheme and subtopic mapping for every leaf', () => {
    const input = toValidationInput();
    const parentIds = new Set(input.questions.map((question) => question.parentId).filter(Boolean));
    const leaves = input.questions.filter((question) => !parentIds.has(question.id));

    for (const leaf of leaves) {
      expect(input.schemes.some((scheme) => scheme.questionId === leaf.id), leaf.path).toBe(true);
      expect(leaf.subtopicConfidences.length, leaf.path).toBeGreaterThan(0);
    }
  });

  it('passes all error-level extraction rules in main', () => {
    const findings = validateExtraction(toValidationInput());
    const errors = findings.filter((finding) => finding.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('keeps context parents ungraded and leaves graded', () => {
    const input = toValidationInput();
    const parentIds = new Set(input.questions.map((question) => question.parentId).filter(Boolean));
    for (const question of input.questions) {
      const isParent = parentIds.has(question.id);
      expect(question.marks === null, question.path).toBe(isParent);
    }
  });
});
