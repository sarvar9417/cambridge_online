import { CHAPTER_2_COMPLETE, withChapter2SourceFingerprints } from './lesson-content-chapter2-fidelity';
import { withChapter2EssentialTerms } from './chapter2-essential-terms';
import type { Chapter2Lesson } from './lesson-content-chapter2';
import type { HodderLessonSlide } from './lesson-content-hodder-types';

const currentCheckpoint = (
  id: string,
  section: string,
  subtopicCode: '2.1' | '2.2',
  title: string,
  learningObjectiveCodes: string[],
  sourcePage: number,
  accent: HodderLessonSlide['accent'],
): HodderLessonSlide => ({
  id,
  section,
  subtopicCode,
  eyebrow: 'CAMBRIDGE CHECKPOINT · CURRENT 2026–2028 TARGET',
  title,
  lead: 'Work through approved Cambridge 9618 questions matched to the current 2026–2028 learning objectives. Earlier papers are included only through explicit equivalent/subtopic-compatible mappings; verified 2026 questions can match the current target directly.',
  learningObjectiveCodes,
  checkpointLabel: learningObjectiveCodes.join(' · '),
  checkpointSyllabusCode: '9618',
  checkpointYearFrom: 2021,
  checkpointYearTo: 2026,
  sourcePages: [sourcePage],
  sourceLabel: 'Cambridge 9618 · 2.1 Networks including the internet · current target',
  sourceElements: [
    'Current 2026–2028 2.1 learning objectives',
    'Explicit compatibility graph → approved 2021–2026 past-paper leaves',
  ],
  examPractice: true,
  accent,
});

const networkingCheckpoint = currentCheckpoint(
  'h2-cp-networking-full',
  '2.1 Networking',
  '2.1',
  'Cambridge checkpoint: networking devices, models, topologies, cloud, wired/wireless, Ethernet and bit streaming',
  ['2.1.1', '2.1.2', '2.1.3', '2.1.4', '2.1.5', '2.1.6', '2.1.7', '2.1.8', '2.1.9', '2.1.10', '2.1.11'],
  53,
  'indigo',
);

const internetCheckpoint = currentCheckpoint(
  'h2-cp-internet-full',
  '2.2 The internet',
  '2.2',
  'Cambridge checkpoint: internet, IP addresses, DNS and HTML',
  ['2.1.12', '2.1.13', '2.1.14', '2.1.15'],
  67,
  'cyan',
);

function withSectionEndCheckpoints(slides: readonly HodderLessonSlide[]) {
  const result: HodderLessonSlide[] = [];
  const studySlides = slides
    .filter(slide => !slide.examPractice)
    .map((slide, index) => ({ slide, index }))
    .sort((left, right) => {
      const reviewOrder = (slide: HodderLessonSlide) => {
        if ((slide as { emphasisBoard?: boolean }).emphasisBoard) return 1000;
        if (slide.id === 'h2-review-terms') return 1100;
        if (slide.id === 'h2-review-activity') return 1200;
        return Math.min(...(slide.sourcePages ?? [999]));
      };
      return reviewOrder(left.slide) - reviewOrder(right.slide) || left.index - right.index;
    })
    .map(item => item.slide);

  for (const slide of studySlides) {
    result.push(slide);
    if (slide.id === 'h2-219-real-time') result.push(networkingCheckpoint);
    if (slide.id === 'h2-226-client-server-side') result.push(internetCheckpoint);
  }
  return result;
}

/**
 * Final active Chapter 2 route: source-complete presentation content followed
 * by topic-level Cambridge practice that targets the current syllabus codes.
 */
const chapterWithEssentialTerms = withChapter2EssentialTerms(CHAPTER_2_COMPLETE);

export const CHAPTER_2_FINAL: Chapter2Lesson = {
  ...CHAPTER_2_COMPLETE,
  coverage: `${CHAPTER_2_COMPLETE.coverage} · current 2026–2028 checkpoints query approved 2021–2026 Cambridge papers`,
  slides: withChapter2SourceFingerprints(withSectionEndCheckpoints(chapterWithEssentialTerms.slides)),
};
