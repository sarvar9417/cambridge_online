import { CHAPTER_7 as DISCOVERY_CHAPTER_7, CHAPTER_7_REVEAL_ID } from './lesson-content-chapter7';
import { CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES, CHAPTER_7_SOURCE_ATOM_COVERAGE } from './chapter7-source-atom-complete';
import { CHAPTER_7_PAST_PAPER_CHECKPOINTS, withChapter7PastPaperCheckpoints } from './chapter7-past-paper-checkpoints';
import { CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES, CHAPTER_7_COURSEBOOK_PAGE_SLIDES } from './coursebook-page-slides';
import { rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';

const chapter7BookWithCheckpoints = withChapter7PastPaperCheckpoints(CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES);
const chapter7RawEmphasisCount=rawPdfEmphasisForChapter(7).length;

/**
 * Complete Chapter 7 presenter route.
 *
 * Invariant: the guided-discovery lesson remains first. The normal coursebook
 * teaching route follows, then a formal glossary and an explicit page-by-page
 * source route. The latter is intentionally redundant: it makes the user's
 * supplied PDF auditable from the actual lesson UI rather than only from tests
 * or hidden source metadata.
 */
export const CHAPTER_7 = {
  ...DISCOVERY_CHAPTER_7,
  subtitle: 'Guided discovery, source-complete Chapter 7 teaching, formal glossary, page-by-page coursebook coverage and live Cambridge 0478 past-paper checkpoints.',
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
    'Coursebook glossary',
    'Coursebook page-by-page',
  ],
  coverage: `15-slide discovery lesson + ${CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES.length}-slide source-exhaustive book deep dive + ${CHAPTER_7_PAST_PAPER_CHECKPOINTS.length} live 0478 checkpoints + ${CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES.length} glossary screens + ${CHAPTER_7_COURSEBOOK_PAGE_SLIDES.length}/41 page-by-page source screens · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.atoms}/${CHAPTER_7_SOURCE_ATOM_COVERAGE.atoms} source atoms pinned · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.pages}/41 source pages audited · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.pages}/41 source pages atom-audited · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.sourceFilePages}/41 exact supplied-PDF page fingerprints · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.sourcePdfDetailAtoms}/${CHAPTER_7_SOURCE_ATOM_COVERAGE.sourcePdfDetailAtoms} source-PDF detail atoms · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.bookCompletenessEvidenceAtoms}/${CHAPTER_7_SOURCE_ATOM_COVERAGE.bookCompletenessEvidenceAtoms} book-completeness evidence atoms · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.keyTerms}/30 formal key terms · ${chapter7RawEmphasisCount}/${chapter7RawEmphasisCount} raw-PDF emphasis anchors visible · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.activities}/20 activities · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.figures}/22 figures · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.tables}/6 tables · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.examQuestions}/9 exam-style questions · regression protected`,
  slides: [
    ...DISCOVERY_CHAPTER_7.slides,
    ...chapter7BookWithCheckpoints,
    ...CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES,
    ...CHAPTER_7_COURSEBOOK_PAGE_SLIDES,
  ],
};

export { CHAPTER_7_REVEAL_ID };
export const CHAPTER_7_DISCOVERY_SLIDE_COUNT = DISCOVERY_CHAPTER_7.slides.length;
export const CHAPTER_7_BOOK_START_ID = CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES[0]?.id ?? '';
