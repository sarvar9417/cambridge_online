export type HodderSourceItemKind = 'figure' | 'table' | 'activity' | 'extension-activity' | 'end-question';

export type HodderSourceItem = Readonly<{
  id: string;
  label: string;
  kind: HodderSourceItemKind;
}>;

const numbered = (kind: 'figure' | 'table', chapter: 2, count: number): readonly HodderSourceItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `hodder-${chapter}-${kind}-${index + 1}`,
    label: `${kind === 'figure' ? 'Figure' : 'Table'} ${chapter}.${index + 1}`,
    kind,
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
  ...numbered('figure', 2, 25),
  ...numbered('table', 2, 10),
  ...(['2A', '2B', '2C'] as const).map(label => ({
    id: `hodder-2-activity-${label.toLowerCase()}`,
    label: `ACTIVITY ${label}`,
    kind: 'activity' as const,
  })),
  ...(['2A', '2B', '2C', '2D', '2E', '2F'] as const).map(label => ({
    id: `hodder-2-extension-${label.toLowerCase()}`,
    label: `EXTENSION ACTIVITY ${label}`,
    kind: 'extension-activity' as const,
  })),
  ...([1, 2, 3, 4, 5] as const).map(question => ({
    id: `hodder-2-end-question-${question}`,
    label: `End of chapter Q${question}`,
    kind: 'end-question' as const,
  })),
] satisfies readonly HodderSourceItem[]);

export const CHAPTER_2_HODDER_SOURCE_COUNTS = Object.freeze({
  figures: 25,
  tables: 10,
  activities: 3,
  extensionActivities: 6,
  endQuestions: 5,
  total: 49,
});
