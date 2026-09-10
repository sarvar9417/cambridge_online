export type HodderSourceItemKind = 'figure' | 'table' | 'activity' | 'extension-activity' | 'end-question';

export type HodderSourceItem = Readonly<{
  id: string;
  label: string;
  kind: HodderSourceItemKind;
}>;

/** Reusable numbered Figure/Table inventory for connected Hodder chapters. */
export const numberedHodderItems = (
  kind: 'figure' | 'table',
  chapter: number,
  count: number,
): readonly HodderSourceItem[] => Array.from({ length: count }, (_, index) => ({
  id: `hodder-${chapter}-${kind}-${index + 1}`,
  label: `${kind === 'figure' ? 'Figure' : 'Table'} ${chapter}.${index + 1}`,
  kind,
} as const));

/** Reusable lettered Activity/Extension Activity inventory. */
export const letteredHodderItems = (
  kind: 'activity' | 'extension-activity',
  chapter: number,
  labels: readonly string[],
): readonly HodderSourceItem[] => labels.map(label => ({
  id: `hodder-${chapter}-${kind === 'activity' ? 'activity' : 'extension'}-${label.toLowerCase()}`,
  label: `${kind === 'activity' ? 'ACTIVITY' : 'EXTENSION ACTIVITY'} ${label}`,
  kind,
} as const));

/** Reusable end-of-chapter question-group inventory. */
export const endQuestionHodderItems = (
  chapter: number,
  questions: readonly number[],
): readonly HodderSourceItem[] => questions.map(question => ({
  id: `hodder-${chapter}-end-question-${question}`,
  label: `End of chapter Q${question}`,
  kind: 'end-question',
} as const));

/**
 * Canonical Chapter 2 source inventory from the connected Hodder chapter PDF.
 * Keep this inventory independent of presentation implementation so future
 * chapters can use the same source-completeness contract.
 *
 * Chapter 2 contains Figures 2.1–2.25, Tables 2.1–2.10, Activities 2A–2C,
 * Extension Activities 2A–2F, and five end-of-chapter question groups.
 */
export const CHAPTER_2_HODDER_SOURCE_MANIFEST = Object.freeze([
  ...numberedHodderItems('figure', 2, 25),
  ...numberedHodderItems('table', 2, 10),
  ...letteredHodderItems('activity', 2, ['2A', '2B', '2C']),
  ...letteredHodderItems('extension-activity', 2, ['2A', '2B', '2C', '2D', '2E', '2F']),
  ...endQuestionHodderItems(2, [1, 2, 3, 4, 5]),
] satisfies readonly HodderSourceItem[]);

export const CHAPTER_2_HODDER_SOURCE_COUNTS = Object.freeze({
  figures: 25,
  tables: 10,
  activities: 3,
  extensionActivities: 6,
  endQuestions: 5,
  total: 49,
});
