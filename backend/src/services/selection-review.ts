export type SelectionRole = 'graded' | 'context_only';
export type DependencyKind = 'text_ref' | 'answer_ref';
export type DependencyStrength = 'required' | 'context_only';

export interface PortableAsset {
  id: string;
  kind: string;
  storagePath: string | null;
  contentMd: string | null;
  altText: string;
  sortOrder: number;
  sourcePage: number | null;
}

export interface PortableQuestion {
  leaf: {
    id: string;
    rootId: string;
    label: string;
    path: string;
    displayRef: string;
    stem: string;
    commandWord: string | null;
    marks: number;
    answerKind: string;
    answerLines: number | null;
  };
  chain: Array<{ id: string; label: string; depth: number }>;
  contextBlocks: Array<{
    id: string;
    label: string;
    displayRef: string;
    depth: number;
    context: string | null;
    assets: PortableAsset[];
  }>;
  dependencies: Array<{
    id: string;
    questionId: string;
    dependsOnId: string;
    displayRef: string;
    stem: string | null;
    kind: DependencyKind;
    strength: DependencyStrength;
    evidence: string | null;
    confidence: number | null;
  }>;
  sourceRef: string;
}

export interface SelectionItemPortable {
  id: string;
  role: SelectionRole;
  sortOrder: number;
  sourceRef: string;
  portable: PortableQuestion;
}

export type SelectionDependencyIssueCode =
  | 'answer_dependency_requires_graded'
  | 'required_text_dependency_missing'
  | 'optional_text_dependency_missing';

export interface SelectionDependencyIssue {
  code: SelectionDependencyIssueCode;
  severity: 'error' | 'warning';
  questionId: string;
  questionRef: string;
  dependsOnId: string;
  dependsOnRef: string;
  evidence: string | null;
}

export interface SelectionReviewItem extends SelectionItemPortable {
  freshRef: string;
  effectiveMarks: number;
}

export interface SelectionReview {
  items: SelectionReviewItem[];
  totalMarks: number;
  dependencyIssues: SelectionDependencyIssue[];
  canPublish: boolean;
}

const suffix = (item: SelectionItemPortable) =>
  item.portable.chain
    .slice(1)
    .map((node) => `(${node.label})`)
    .join('');

/**
 * Build generated-paper numbering and enforce dependency semantics.
 *
 * Important: an answer_ref can never be satisfied by context_only. If a leaf
 * says "using your answer to part (a)", part (a) must itself be graded so the
 * candidate actually produces the answer that the dependent part consumes.
 */
export function buildSelectionReview(items: SelectionItemPortable[]): SelectionReview {
  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const groups = new Map<string, SelectionItemPortable[]>();
  for (const item of ordered) {
    const rootId = item.portable.leaf.rootId;
    const group = groups.get(rootId) ?? [];
    group.push(item);
    groups.set(rootId, group);
  }

  const numbered = new Map<string, string>();
  let number = 0;
  for (const group of groups.values()) {
    number += 1;
    for (const item of group) {
      numbered.set(item.id, group.length === 1 ? `Q${number}` : `Q${number}${suffix(item)}`);
    }
  }

  const reviewItems = ordered.map((item) => ({
    ...item,
    freshRef: numbered.get(item.id)!,
    effectiveMarks: item.role === 'graded' ? item.portable.leaf.marks : 0,
  }));

  const byQuestionId = new Map(
    reviewItems.map((item) => [item.portable.leaf.id, item] as const),
  );
  const dependencyIssues: SelectionDependencyIssue[] = [];

  for (const item of reviewItems) {
    // Dependencies matter when the candidate is expected to answer this item.
    if (item.role !== 'graded') continue;

    for (const dependency of item.portable.dependencies) {
      const target = byQuestionId.get(dependency.dependsOnId);
      if (dependency.kind === 'answer_ref') {
        if (target?.role !== 'graded') {
          dependencyIssues.push({
            code: 'answer_dependency_requires_graded',
            severity: 'error',
            questionId: item.portable.leaf.id,
            questionRef: item.sourceRef,
            dependsOnId: dependency.dependsOnId,
            dependsOnRef: dependency.displayRef,
            evidence: dependency.evidence,
          });
        }
        continue;
      }

      if (dependency.kind === 'text_ref' && !target) {
        dependencyIssues.push({
          code:
            dependency.strength === 'required'
              ? 'required_text_dependency_missing'
              : 'optional_text_dependency_missing',
          severity: dependency.strength === 'required' ? 'error' : 'warning',
          questionId: item.portable.leaf.id,
          questionRef: item.sourceRef,
          dependsOnId: dependency.dependsOnId,
          dependsOnRef: dependency.displayRef,
          evidence: dependency.evidence,
        });
      }
    }
  }

  return {
    items: reviewItems,
    totalMarks: reviewItems.reduce((sum, item) => sum + item.effectiveMarks, 0),
    dependencyIssues,
    canPublish: !dependencyIssues.some((issue) => issue.severity === 'error'),
  };
}
