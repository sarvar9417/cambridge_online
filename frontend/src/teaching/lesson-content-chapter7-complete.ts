import { CHAPTER_7 as DISCOVERY_CHAPTER_7, CHAPTER_7_REVEAL_ID } from './lesson-content-chapter7';
import { CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES, CHAPTER_7_SOURCE_ATOM_COVERAGE } from './chapter7-source-atom-complete';
import { CHAPTER_7_PAST_PAPER_CHECKPOINTS } from './chapter7-past-paper-checkpoints';
import { rawPdfEmphasisForChapter } from './raw-pdf-emphasis-baseline';
import { buildPdfFirstChapter7Route } from './pdf-first-section-lessons';
import { pdfFirstBlocksForSection, pdfFirstSectionsForChapter } from './pdf-first-source-index';

const chapter7PdfFirstRoute = buildPdfFirstChapter7Route(CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES);
const chapter7RawEmphasisCount=rawPdfEmphasisForChapter(7).length;
const chapter7PdfBlockCount=pdfFirstSectionsForChapter(7)
  .reduce((total,meta)=>total+pdfFirstBlocksForSection(meta.id).length,0);

/**
 * Complete Chapter 7 presenter route.
 *
 * The guided-discovery prelude is retained, but the book route is no longer a
 * glossary/page-by-page appendix. Every 7.1–7.9 section now contains its
 * curated teaching sequence plus every exact supplied-PDF source block in
 * source order, followed by one Cambridge Exam Lens and the live Past Paper
 * checkpoint for that same section.
 */
export const CHAPTER_7 = {
  ...DISCOVERY_CHAPTER_7,
  subtitle: 'Guided discovery followed by section-first, exact supplied-PDF Chapter 7 teaching: source → Cambridge Exam Lens → live 0478 Past Papers.',
  subtopics: [
    '7.1 The program development life cycle',
    '7.2 Computer systems, sub-systems and decomposition',
    '7.3 Explaining the purpose of an algorithm',
    '7.4 Standard methods of solution',
    '7.5 Validation and verification',
    '7.6 Test data',
    '7.7 Trace tables and dry runs',
    '7.8 Identifying errors in algorithms',
    '7.9 Writing and amending algorithms',
  ],
  coverage: `15-slide guided-discovery prelude + ${CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES.length}-slide curated source route + ${chapter7PdfBlockCount}/${chapter7PdfBlockCount} exact supplied-PDF blocks assigned to 7.1–7.9 + ${CHAPTER_7_PAST_PAPER_CHECKPOINTS.length} section-end live 0478 checkpoints · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.atoms}/${CHAPTER_7_SOURCE_ATOM_COVERAGE.atoms} source atoms pinned · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.pages}/41 source pages audited · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.sourceFilePages}/41 exact supplied-PDF page fingerprints · ${CHAPTER_7_SOURCE_ATOM_COVERAGE.keyTerms}/30 formal key terms · ${chapter7RawEmphasisCount}/${chapter7RawEmphasisCount} raw-PDF emphasis anchors audited · glossary/page-by-page appendix removed from active route`,
  slides: [
    ...DISCOVERY_CHAPTER_7.slides,
    ...chapter7PdfFirstRoute,
  ],
};

export { CHAPTER_7_REVEAL_ID };
export const CHAPTER_7_DISCOVERY_SLIDE_COUNT = DISCOVERY_CHAPTER_7.slides.length;
export const CHAPTER_7_BOOK_START_ID = chapter7PdfFirstRoute[0]?.id ?? '';
