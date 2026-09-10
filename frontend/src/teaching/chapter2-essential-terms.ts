import type { HodderLessonChapter, HodderLessonSlide } from './lesson-content-hodder-types';
import {
  CHAPTER_2_KEY_TERMS_2_1,
  CHAPTER_2_KEY_TERMS_2_2,
  CHAPTER_2_SOURCE_EMPHASIS,
} from './chapter2-source-emphasis';

export type Chapter2TermsSlide = HodderLessonSlide & { essentialTerms?: boolean };
export type Chapter2EmphasisSlide = HodderLessonSlide & { emphasisBoard?: boolean };

const CHUNK = 6;

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );

/**
 * Term cards pair the exact coursebook definition with a short plain-language
 * explanation. The definition keeps source fidelity; the explanation is what
 * the presenter says out loud.
 */
const termsSlide = (
  index: number,
  total: number,
  section: string,
  subtopicCode: '2.1' | '2.2',
  group: typeof CHAPTER_2_KEY_TERMS_2_1,
  sourcePage: number,
): Chapter2TermsSlide => ({
  id: `h2-terms-${subtopicCode.replace('.', '-')}-${index + 1}`,
  section,
  subtopicCode,
  eyebrow: `${subtopicCode} · ESSENTIAL VOCABULARY · ${index + 1}/${total}`,
  title: subtopicCode === '2.1' ? 'Networking terms you must use precisely' : 'Internet terms you must use precisely',
  lead: 'Each coursebook term includes its formal definition and a short plain-English explanation for classroom use.',
  keyTerms: group.map(item => ({
    term: item.term,
    definition: `${item.definition} In plain English: ${item.simple}`,
  })),
  sourcePages: [sourcePage],
  sourceLabel: `Hodder Chapter 2 · p.${sourcePage} key terms`,
  sourceElements: [`Hodder p.${sourcePage}`, 'Key terms glossary', 'Student-facing simple explanations'],
  essentialTerms: true,
  accent: subtopicCode === '2.1' ? 'cyan' : 'emerald',
});

/** 2.1 Networking term slides (chunked for board readability). */
export const chapter2EssentialTermSlides21 = (): Chapter2TermsSlide[] =>
  chunk(CHAPTER_2_KEY_TERMS_2_1, CHUNK).map((group, index, all) =>
    termsSlide(index, all.length, '2.1 Networking', '2.1', group, 28),
  );

/** 2.2 The internet term slides (chunked for board readability). */
export const chapter2EssentialTermSlides22 = (): Chapter2TermsSlide[] =>
  chunk(CHAPTER_2_KEY_TERMS_2_2, CHUNK).map((group, index, all) =>
    termsSlide(index, all.length, '2.2 The internet', '2.2', group, 54),
  );

/**
 * Board slide listing every bold-typography anchor from the supplied PDF,
 * grouped by printed source page so the presenter can show exactly which
 * coursebook words were emphasised.
 */
export const chapter2EmphasisBoardSlide = (): Chapter2EmphasisSlide => {
  const byPage = new Map<number, string[]>();
  for (const anchor of CHAPTER_2_SOURCE_EMPHASIS) {
    const list = byPage.get(anchor.printedPage) ?? [];
    if (!list.includes(anchor.text)) list.push(anchor.text);
    byPage.set(anchor.printedPage, list);
  }
  const pageGroups = [...byPage.entries()].sort((a, b) => a[0] - b[0]);
  return {
    id: 'h2-emphasis-board',
    section: '2.2 The internet',
    subtopicCode: '2.2',
    eyebrow: 'CHAPTER 2 · COURSEBOOK EMPHASIS · COMPLETE INDEX',
    title: 'Every emphasised coursebook term and reference',
    lead: 'Every meaningful bold term, phrase, table and figure reference extracted from the supplied PDF, grouped by printed coursebook page.',
    bullets: pageGroups.map(([page, texts]) => `p.${page} — ${texts.join(', ')}`),
    sourcePages: [...byPage.keys()].sort((a, b) => a - b),
    sourceLabel: 'Hodder Chapter 2 · bold typography baseline (exact supplied PDF)',
    sourceElements: ['Bold-span extraction from chapterlar/9618_Chapter_2.pdf', `${CHAPTER_2_SOURCE_EMPHASIS.length} emphasised anchors`],
    emphasisBoard: true,
    accent: 'amber',
  };
};

/** Split the audit board into projector-safe screens instead of one long page. */
export const chapter2EmphasisBoardSlides = (): Chapter2EmphasisSlide[] => {
  const full = chapter2EmphasisBoardSlide();
  const groups = chunk(full.bullets ?? [], 7);
  return groups.map((bullets, index) => {
    const sourcePages = bullets
      .map(line => Number(line.match(/^p\.(\d+)/)?.[1]))
      .filter(page => Number.isFinite(page));
    return {
      ...full,
      id: `${full.id}-${index + 1}`,
      eyebrow: `CHAPTER 2 · COURSEBOOK EMPHASIS · ${index + 1}/${groups.length}`,
      title: `Important emphasised coursebook content · ${index + 1}/${groups.length}`,
      bullets,
      sourcePages,
      sourceElements: [
        'Bold-span extraction from chapterlar/9618_Chapter_2.pdf',
        `Projector-safe emphasis group ${index + 1}/${groups.length}`,
      ],
    };
  });
};

export type Chapter2EnrichedChapter = Omit<HodderLessonChapter, 'number'> & { number: 2 };

/**
 * Insert essential-terms slides after the last concept slide of each section
 * (before its Past Paper checkpoint) and append the bold-emphasis board slide
 * to the chapter review. Insertion is idempotent: running twice does not
 * duplicate slides.
 */
export function withChapter2EssentialTerms(chapter: Chapter2EnrichedChapter): Chapter2EnrichedChapter {
  if (chapter.slides.some(slide => (slide as Chapter2TermsSlide).essentialTerms)) return chapter;
  const result: HodderLessonSlide[] = [];
  const terms21 = chapter2EssentialTermSlides21();
  const terms22 = chapter2EssentialTermSlides22();
  let inserted21 = false;
  let inserted22 = false;

  for (const slide of chapter.slides) {
    if (slide.id === 'h2-219-real-time' && !inserted21) {
      result.push(...terms21);
      inserted21 = true;
    }
    if (slide.id === 'h2-226-client-server-side' && !inserted22) {
      result.push(...terms22);
      inserted22 = true;
    }
    result.push(slide);
  }
  if (!inserted21 || !inserted22) {
    throw new Error('Chapter 2 essential-terms insertion points missing: h2-219-real-time / h2-226-client-server-side');
  }

  // Bold-emphasis board slide goes before the final review-terms slide.
  const reviewIndex = result.findIndex(slide => slide.id === 'h2-review-terms');
  const emphasis = chapter2EmphasisBoardSlides();
  if (reviewIndex >= 0) result.splice(reviewIndex, 0, ...emphasis);
  else result.push(...emphasis);

  return {
    ...chapter,
    coverage: `${chapter.coverage} · ${CHAPTER_2_KEY_TERMS_2_1.length + CHAPTER_2_KEY_TERMS_2_2.length} key terms with simple explanations · ${CHAPTER_2_SOURCE_EMPHASIS.length} bold-typography anchors`,
    slides: result,
  };
}
