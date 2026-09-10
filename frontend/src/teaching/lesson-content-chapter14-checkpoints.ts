import { CHAPTER_14_COMPLETE } from './lesson-content-chapter14-fidelity';
import type { Chapter14Lesson } from './lesson-content-chapter14';
import type { HodderLessonSlide } from './lesson-content-hodder-types';

const currentCheckpoint = (
  id: string,
  section: string,
  subtopicCode: '14.1' | '14.2',
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
  sourceLabel: `Cambridge 9618 · ${subtopicCode} current target`,
  sourceElements: [
    `Current 2026–2028 ${subtopicCode} learning objectives`,
    'Explicit compatibility graph → approved 2021–2026 past-paper leaves',
  ],
  examPractice: true,
  accent,
});

const protocolCheckpoint = currentCheckpoint(
  'h14-cp-protocols',
  '14.1 Protocols',
  '14.1',
  'Cambridge checkpoint: protocols and internet technologies',
  ['14.1.1', '14.1.2', '14.1.3', '14.1.4'],
  337,
  'indigo',
);

const switchingCheckpoint = currentCheckpoint(
  'h14-cp-switching',
  '14.2 Circuit switching and packet switching',
  '14.2',
  'Cambridge checkpoint: circuit switching and packet switching',
  ['14.2.1', '14.2.2', '14.2.3'],
  345,
  'cyan',
);

function withSectionEndCheckpoints(slides: readonly HodderLessonSlide[]) {
  const result: HodderLessonSlide[] = [];
  for (const slide of slides) {
    result.push(slide);
    if (slide.id === 'h14-bittorrent-figure') result.push(protocolCheckpoint);
    if (slide.id === 'h14-eoc-4-complete') result.push(switchingCheckpoint);
  }
  return result;
}

/**
 * Final active Chapter 14 route: source-complete presentation content followed
 * by topic-level Cambridge practice that targets the current syllabus codes.
 * The backend is responsible for compatibility expansion and question
 * renderability, so this layer never substitutes a loosely related question.
 */
export const CHAPTER_14_FINAL: Chapter14Lesson = {
  ...CHAPTER_14_COMPLETE,
  coverage: `${CHAPTER_14_COMPLETE.coverage} · current 2026–2028 checkpoints query approved 2021–2026 Cambridge papers`,
  slides: withSectionEndCheckpoints(CHAPTER_14_COMPLETE.slides),
};
