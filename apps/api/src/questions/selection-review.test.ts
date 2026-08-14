import { describe, expect, it } from 'vitest';
import { buildSelectionReview } from './selection-review.js';
import type { SelectionItemPortable } from './question-bank.types.js';

const item = (
  id: string,
  role: 'graded' | 'context_only',
  sortOrder: number,
  labels: string[],
): SelectionItemPortable => ({
  id,
  role,
  sortOrder,
  sourceRef: `9618/22/O/N/25 ${labels.join('')}`,
  portable: {
    leaf: {
      id,
      rootId: 'root',
      label: labels.at(-1)!,
      path: labels.join('.'),
      displayRef: labels.join(''),
      stem: id,
      commandWord: null,
      marks: 4,
      answerKind: 'short',
      answerLines: null,
    },
    chain: labels.map((label, depth) => ({ id: `${id}-${depth}`, label, depth })),
    contextBlocks: [],
    dependencies: [],
    sourceRef: labels.join(''),
  },
});

describe('buildSelectionReview', () => {
  it('renumbers a real three-level chain while retaining its source reference', () => {
    const review = buildSelectionReview([item('leaf', 'graded', 1, ['3', 'a', 'ii'])]);
    expect(review.items[0]).toMatchObject({
      freshRef: 'Q1',
      sourceRef: '9618/22/O/N/25 3aii',
      effectiveMarks: 4,
    });
  });

  it('uses part suffixes within a family and gives context-only items zero marks', () => {
    const review = buildSelectionReview([
      item('a', 'context_only', 1, ['3', 'a']),
      item('b', 'graded', 2, ['3', 'b']),
    ]);
    expect(review.items.map((entry) => [entry.freshRef, entry.effectiveMarks])).toEqual([
      ['Q1(a)', 0],
      ['Q1(b)', 4],
    ]);
    expect(review.totalMarks).toBe(4);
  });
});
