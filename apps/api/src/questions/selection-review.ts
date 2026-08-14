import type { SelectionItemPortable, SelectionReview } from './question-bank.types.js';

const suffix = (item: SelectionItemPortable) =>
  item.portable.chain
    .slice(1)
    .map((node) => `(${node.label})`)
    .join('');

/** Pure numbering/total logic shared by the API response and its regression tests. */
export function buildSelectionReview(items: SelectionItemPortable[]): SelectionReview {
  const groups = new Map<string, SelectionItemPortable[]>();
  for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
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

  const reviewItems = [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      ...item,
      freshRef: numbered.get(item.id)!,
      effectiveMarks: item.role === 'graded' ? item.portable.leaf.marks : 0,
    }));
  return {
    items: reviewItems,
    totalMarks: reviewItems.reduce((sum, item) => sum + item.effectiveMarks, 0),
  };
}
