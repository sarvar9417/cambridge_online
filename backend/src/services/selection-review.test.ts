import { describe, expect, it } from 'vitest';
import {
  buildSelectionReview,
  type PortableQuestion,
  type SelectionItemPortable,
  type SelectionRole,
} from './selection-review.js';

function portable(
  id: string,
  path: string,
  marks: number,
  dependency?: PortableQuestion['dependencies'][number],
): PortableQuestion {
  const labels = path.split('.');
  return {
    leaf: {
      id,
      rootId: `root-${labels[0]}`,
      label: labels.at(-1)!,
      path,
      displayRef: `9618/11/M/J/23 Q${labels[0]}${labels.slice(1).map((v) => `(${v})`).join('')}`,
      stem: `Stem for ${path}`,
      commandWord: 'Explain',
      marks,
      answerKind: 'text',
      answerLines: marks * 2,
    },
    chain: labels.map((label, index) => ({
      id: index === labels.length - 1 ? id : `node-${labels.slice(0, index + 1).join('.')}`,
      label,
      depth: index,
    })),
    contextBlocks: [],
    dependencies: dependency ? [dependency] : [],
    sourceRef: `9618/11/M/J/23 Q${labels[0]}${labels.slice(1).map((v) => `(${v})`).join('')}`,
  };
}

function item(
  id: string,
  role: SelectionRole,
  sortOrder: number,
  question: PortableQuestion,
): SelectionItemPortable {
  return { id, role, sortOrder, sourceRef: question.sourceRef, portable: question };
}

const answerDependency = (fromId: string, targetId: string) => ({
  id: 'dep-answer',
  questionId: fromId,
  dependsOnId: targetId,
  displayRef: '9618/11/M/J/23 Q3(a)',
  stem: 'Write an SQL query.',
  kind: 'answer_ref' as const,
  strength: 'required' as const,
  evidence: 'using your answer to part (a)',
  confidence: 0.98,
});

const textDependency = (fromId: string, targetId: string, strength: 'required' | 'context_only' = 'required') => ({
  id: 'dep-text',
  questionId: fromId,
  dependsOnId: targetId,
  displayRef: '9618/11/M/J/23 Q3(a)',
  stem: 'Study the table in part (a).',
  kind: 'text_ref' as const,
  strength,
  evidence: 'the table in part (a)',
  confidence: 0.96,
});

describe('selection review dependency semantics', () => {
  it('blocks answer_ref when the prerequisite is absent', () => {
    const dependent = portable('q3bi', '3.b.i', 3, answerDependency('q3bi', 'q3a'));
    const review = buildSelectionReview([item('item-bi', 'graded', 1, dependent)]);

    expect(review.canPublish).toBe(false);
    expect(review.dependencyIssues).toEqual([
      expect.objectContaining({ code: 'answer_dependency_requires_graded', severity: 'error' }),
    ]);
  });

  it('still blocks answer_ref when the prerequisite is context_only', () => {
    const prerequisite = portable('q3a', '3.a', 2);
    const dependent = portable('q3bi', '3.b.i', 3, answerDependency('q3bi', 'q3a'));
    const review = buildSelectionReview([
      item('item-bi', 'graded', 1, dependent),
      item('item-a', 'context_only', 2, prerequisite),
    ]);

    expect(review.canPublish).toBe(false);
    expect(review.totalMarks).toBe(3);
    expect(review.dependencyIssues[0]?.code).toBe('answer_dependency_requires_graded');
  });

  it('satisfies answer_ref only when the prerequisite is graded', () => {
    const prerequisite = portable('q3a', '3.a', 2);
    const dependent = portable('q3bi', '3.b.i', 3, answerDependency('q3bi', 'q3a'));
    const review = buildSelectionReview([
      item('item-a', 'graded', 1, prerequisite),
      item('item-bi', 'graded', 2, dependent),
    ]);

    expect(review.canPublish).toBe(true);
    expect(review.dependencyIssues).toEqual([]);
    expect(review.totalMarks).toBe(5);
    expect(review.items.map((entry) => entry.freshRef)).toEqual(['Q1(a)', 'Q1(b)(i)']);
  });

  it('allows required text_ref when the printed sibling is context_only', () => {
    const prerequisite = portable('q3a', '3.a', 2);
    const dependent = portable('q3bi', '3.b.i', 3, textDependency('q3bi', 'q3a'));
    const review = buildSelectionReview([
      item('item-bi', 'graded', 1, dependent),
      item('item-a', 'context_only', 2, prerequisite),
    ]);

    expect(review.canPublish).toBe(true);
    expect(review.totalMarks).toBe(3);
    expect(review.dependencyIssues).toEqual([]);
  });

  it('blocks missing required text_ref but only warns for optional context', () => {
    const required = portable('required', '3.b.i', 3, textDependency('required', 'q3a'));
    const optional = portable(
      'optional',
      '4.b',
      2,
      textDependency('optional', 'q4a', 'context_only'),
    );

    const requiredReview = buildSelectionReview([item('required-item', 'graded', 1, required)]);
    expect(requiredReview.canPublish).toBe(false);
    expect(requiredReview.dependencyIssues[0]?.code).toBe('required_text_dependency_missing');

    const optionalReview = buildSelectionReview([item('optional-item', 'graded', 1, optional)]);
    expect(optionalReview.canPublish).toBe(true);
    expect(optionalReview.dependencyIssues[0]).toEqual(
      expect.objectContaining({ code: 'optional_text_dependency_missing', severity: 'warning' }),
    );
  });

  it('groups selected subparts under fresh question numbering while retaining source refs', () => {
    const q3a = portable('q3a', '3.a', 2);
    const q3bi = portable('q3bi', '3.b.i', 3);
    const q6c = portable('q6c', '6.c', 4);
    const review = buildSelectionReview([
      item('a', 'graded', 1, q3a),
      item('bi', 'graded', 2, q3bi),
      item('c', 'graded', 3, q6c),
    ]);

    expect(review.items.map(({ freshRef }) => freshRef)).toEqual(['Q1(a)', 'Q1(b)(i)', 'Q2']);
    expect(review.items.map(({ sourceRef }) => sourceRef)).toEqual([
      q3a.sourceRef,
      q3bi.sourceRef,
      q6c.sourceRef,
    ]);
    expect(review.totalMarks).toBe(9);
  });
});
