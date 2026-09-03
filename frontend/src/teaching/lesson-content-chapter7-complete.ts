import { CHAPTER_7 as DISCOVERY_CHAPTER_7, CHAPTER_7_REVEAL_ID } from './lesson-content-chapter7';
import { CHAPTER_7_BOOK_SLIDES } from './chapter7-book-content';

/**
 * Complete Chapter 7 presenter route.
 *
 * Invariant: the original guided-discovery lesson remains first and unchanged.
 * The coursebook deep-dive is appended only after that sequence.
 */
export const CHAPTER_7 = {
  ...DISCOVERY_CHAPTER_7,
  subtitle: 'Guided discovery first, then the complete Chapter 7 coursebook deep dive.',
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
  coverage: `15-slide discovery lesson + ${CHAPTER_7_BOOK_SLIDES.length}-slide complete book deep dive`,
  slides: [...DISCOVERY_CHAPTER_7.slides, ...CHAPTER_7_BOOK_SLIDES],
};

export { CHAPTER_7_REVEAL_ID };
export const CHAPTER_7_DISCOVERY_SLIDE_COUNT = DISCOVERY_CHAPTER_7.slides.length;
export const CHAPTER_7_BOOK_START_ID = CHAPTER_7_BOOK_SLIDES[0]?.id ?? '';
