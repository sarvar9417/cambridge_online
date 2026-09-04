import type { LessonSlide } from './lesson-content-full';
import { CHAPTER_7_FINAL_SOURCE_SLIDES } from './chapter7-source-final-hardening';
import { CHAPTER_7_SOURCE_ATOMS } from './chapter7-source-atoms';
import { CHAPTER_7_SOURCE_ACTIVITY_ATOMS } from './chapter7-source-activity-atoms';
import { CHAPTER_7_SOURCE_MAP } from './chapter7-book-coverage';
import { CHAPTER_7_SOURCE_PAGE_AUDIT } from './chapter7-source-page-audit';
import { CHAPTER_7_SOURCE_KEY_TERMS, withChapter7SourceKeyTerms } from './chapter7-source-keyterms';

export const CHAPTER_7_ALL_SOURCE_ATOMS = [
  ...CHAPTER_7_SOURCE_ATOMS,
  ...CHAPTER_7_SOURCE_ACTIVITY_ATOMS,
];

const atomsBySlide = new Map<string, typeof CHAPTER_7_ALL_SOURCE_ATOMS>();
for (const atom of CHAPTER_7_ALL_SOURCE_ATOMS) {
  const current = atomsBySlide.get(atom.targetSlideId) ?? [];
  atomsBySlide.set(atom.targetSlideId, [...current, atom]);
}

const sourceBlock = (slide: LessonSlide): LessonSlide => {
  const atoms = atomsBySlide.get(slide.id) ?? [];
  if (!atoms.length) return slide;

  const sourceLines = atoms.map((atom) =>
    `[${atom.sourceRef} · p.${atom.printedPage}] ${atom.needles.join(' · ')}`,
  );
  const existing = slide.activity;

  return {
    ...slide,
    activity: {
      title: existing ? `${existing.title} · BOOK SOURCE` : 'BOOK SOURCE',
      prompt: [
        ...(existing ? [existing.prompt] : []),
        ...sourceLines,
      ].join('\n'),
      ...(existing?.reveal ? { reveal: existing.reveal } : {}),
    },
  };
};

/**
 * Chapter 7 source-atom-complete presenter layer.
 *
 * Chapters 1 and 13 already protect source details by pinning semantic atoms to
 * real teaching slides. Chapter 7 now uses the same architecture: source-level
 * terms, formal key-term definitions, named examples, exact values/code
 * fragments, activity prompts/data, figures, tables, review items and exam-style
 * question identifiers are attached to the presenter route rather than being
 * represented only by a page-level summary.
 */
export const CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES: LessonSlide[] =
  withChapter7SourceKeyTerms(CHAPTER_7_FINAL_SOURCE_SLIDES).map(sourceBlock);

export const CHAPTER_7_SOURCE_ATOM_COVERAGE = {
  atoms: CHAPTER_7_ALL_SOURCE_ATOMS.length,
  pages: CHAPTER_7_SOURCE_PAGE_AUDIT.length,
  keyTerms: CHAPTER_7_SOURCE_KEY_TERMS.length,
  activities: Object.keys(CHAPTER_7_SOURCE_MAP.activities).length,
  figures: Object.keys(CHAPTER_7_SOURCE_MAP.figures).length,
  tables: Object.keys(CHAPTER_7_SOURCE_MAP.tables).length,
  examQuestions: Object.keys(CHAPTER_7_SOURCE_MAP.examQuestions).length,
  bookExtras: Object.keys(CHAPTER_7_SOURCE_MAP.bookExtras).length,
} as const;
