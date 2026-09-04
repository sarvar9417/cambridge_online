export type Chapter7SourcePageAudit = {
  printedPage: number;
  targetSlideIds: string[];
};

/**
 * Page-level trace from the supplied Cambridge IGCSE/O Level Chapter 7 extract
 * (printed pages 258–298) into the student-facing presenter route.
 *
 * This is intentionally separate from the figure/table/activity map: a page is
 * only considered covered when at least one real teaching slide carries the
 * prose, worked method, task or review material from that printed page.
 */
export const CHAPTER_7_SOURCE_PAGE_AUDIT: Chapter7SourcePageAudit[] = [
  { printedPage: 258, targetSlideIds: ['ch7-book-71-five-stages','ch7-book-71-abstraction-maps'] },
  { printedPage: 259, targetSlideIds: ['ch7-book-71-decompose-dressed','ch7-book-71-design','ch7-book-71-coding','ch7-book-71-testing'] },
  { printedPage: 260, targetSlideIds: ['ch7-book-72-system','ch7-book-72-top-down','ch7-book-72-ipos'] },
  { printedPage: 261, targetSlideIds: ['ch7-book-72-alarm-ipos','ch7-book-72-structure-basic'] },
  { printedPage: 262, targetSlideIds: ['ch7-book-72-alarm-tree','ch7-book-72-teeth','ch7-book-72-flow-purpose'] },
  { printedPage: 263, targetSlideIds: ['ch7-book-72-flow-symbols-a','ch7-book-72-flow-symbols-b'] },
  { printedPage: 264, targetSlideIds: ['ch7-book-72-ticket-flow'] },
  { printedPage: 265, targetSlideIds: ['ch7-book-72-pseudo-rules','ch7-book-72-operators'] },
  { printedPage: 266, targetSlideIds: ['ch7-book-72-activity73','ch7-book-72-if-case'] },
  { printedPage: 267, targetSlideIds: ['ch7-book-72-comparison'] },
  { printedPage: 268, targetSlideIds: ['ch7-book-72-nested-if','ch7-book-72-case-day'] },
  { printedPage: 269, targetSlideIds: ['ch7-book-72-loops','ch7-book-72-loop-examples'] },
  { printedPage: 270, targetSlideIds: ['ch7-book-72-repeat-detail','ch7-book-72-while-detail','ch7-book-72-input-output'] },
  { printedPage: 271, targetSlideIds: ['ch7-book-73-purpose','ch7-book-73-activity76'] },
  { printedPage: 272, targetSlideIds: ['ch7-book-74-overview','ch7-book-74-total-count'] },
  { printedPage: 273, targetSlideIds: ['ch7-book-74-countdown','ch7-book-74-max-min'] },
  { printedPage: 274, targetSlideIds: ['ch7-book-74-max-min','ch7-book-74-average','ch7-book-74-linear-search'] },
  { printedPage: 275, targetSlideIds: ['ch7-book-74-linear-search','ch7-book-74-count-matches'] },
  { printedPage: 276, targetSlideIds: ['ch7-book-74-bubble','ch7-book-74-bubble-code','ch7-book-75-difference'] },
  { printedPage: 277, targetSlideIds: ['ch7-book-75-validation-list','ch7-book-75-range','ch7-book-75-length'] },
  { printedPage: 278, targetSlideIds: ['ch7-book-75-type-presence'] },
  { printedPage: 279, targetSlideIds: ['ch7-book-75-format-checkdigit','ch7-book-75-findout-isbn'] },
  { printedPage: 280, targetSlideIds: ['ch7-book-75-activity77','ch7-book-75-verification'] },
  { printedPage: 281, targetSlideIds: ['ch7-book-76-activity78','ch7-book-76-testdata','ch7-book-76-normal'] },
  { printedPage: 282, targetSlideIds: ['ch7-book-76-abnormal','ch7-book-76-extreme-boundary'] },
  { printedPage: 283, targetSlideIds: ['ch7-book-77-trace-intro'] },
  { printedPage: 284, targetSlideIds: ['ch7-book-77-trace-worked','ch7-book-77-activity712','ch7-book-77-same-pseudo'] },
  { printedPage: 285, targetSlideIds: ['ch7-book-78-activity71314'] },
  { printedPage: 286, targetSlideIds: ['ch7-book-78-negative','ch7-book-78-activity716'] },
  { printedPage: 287, targetSlideIds: ['ch7-book-78-first-value','ch7-book-78-activity717'] },
  { printedPage: 288, targetSlideIds: ['ch7-book-79-eight-stages','ch7-book-79-fig1819'] },
  { printedPage: 289, targetSlideIds: ['ch7-book-79-example1'] },
  { printedPage: 290, targetSlideIds: ['ch7-book-79-example2','ch7-book-79-comments'] },
  { printedPage: 291, targetSlideIds: ['ch7-book-79-example2','ch7-book-79-activity719'] },
  { printedPage: 292, targetSlideIds: ['ch7-book-79-activity720','ch7-book-79-ch8-link','ch7-book-ext-stackqueue'] },
  { printedPage: 293, targetSlideIds: ['ch7-book-ext-operations','ch7-book-review'] },
  { printedPage: 294, targetSlideIds: ['ch7-book-keyterms-a','ch7-book-keyterms-b','ch7-book-keyterms-c'] },
  { printedPage: 295, targetSlideIds: ['ch7-book-exam-1-2','ch7-book-exam-3','ch7-book-exam-4-5'] },
  { printedPage: 296, targetSlideIds: ['ch7-book-exam-6a','ch7-book-exam-6bc'] },
  { printedPage: 297, targetSlideIds: ['ch7-book-exam-7'] },
  { printedPage: 298, targetSlideIds: ['ch7-book-exam-8','ch7-book-exam-9'] },
];
