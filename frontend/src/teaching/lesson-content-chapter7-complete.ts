import { CHAPTER_7 as DISCOVERY_CHAPTER_7, CHAPTER_7_REVEAL_ID } from './lesson-content-chapter7';
import { CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES, CHAPTER_7_SOURCE_ATOM_COVERAGE } from './chapter7-source-atom-complete';
import { CHAPTER_7_PAST_PAPER_CHECKPOINTS, withChapter7PastPaperCheckpoints } from './chapter7-past-paper-checkpoints';

const chapter7BookWithCheckpoints = withChapter7PastPaperCheckpoints(CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES);

/**
 * Complete Chapter 7 presenter route.
 *
 * Invariant: the original guided-discovery lesson remains first and unchanged.
 * The coursebook deep-dive is source-atom-complete in the same sense as the
 * Chapter 1/13 routes: exact source terms, formal definitions, examples,
 * values/code fragments and named book elements are pinned to real teaching
 * slides before live Cambridge 0478 checkpoints are inserted after each 7.1–7.9 part.
 */
export const CHAPTER_7 = {
  ...DISCOVERY_CHAPTER_7,
  subtitle: 'Guided discovery first, then a source-atom-complete Chapter 7 coursebook deep dive with textbook terminology, formal definitions, worked values and live Cambridge 0478 past-paper checkpoints.',
  subtopics: [
    '7.1 Program development life cycle',
    '7.2 Systems, decomposition & algorithm design',
    '7.3 Algorithm purpose',
    '7.4 Standard methods',
    '7.5 Validation & verification',
    '7.6 Test data',
    '7.7 Trace tables',
    '7.8 Identifying errors',
    '7.9 Writing & amending algorithms',
  ],
  coverage: `15-slide discovery lesson + ${CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES.length}-slide source-exhaustive book deep dive (source-atom-complete) + ${CHAPTER_7_PAST_PAPER_CHECKPOINTS.length} live 0478 checkpoints · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.atoms}/${CHAPTER_7_SOURCE_ATOM_COVERAGE.atoms} source atoms pinned · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.pages}/41 source pages audited · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.pages}/41 source pages atom-audited · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.sourceFilePages}/41 exact supplied-PDF page fingerprints · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.keyTerms}/30 formal key terms · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.activities}/20 activities · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.figures}/22 figures · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.tables}/6 tables · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.examQuestions}/9 exam-style questions · regression protected`,
  slides: [...DISCOVERY_CHAPTER_7.slides, ...chapter7BookWithCheckpoints],
};

export { CHAPTER_7_REVEAL_ID };
export const CHAPTER_7_DISCOVERY_SLIDE_COUNT = DISCOVERY_CHAPTER_7.slides.length;
export const CHAPTER_7_BOOK_START_ID = CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES[0]?.id ?? '';
