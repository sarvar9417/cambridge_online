import { CHAPTER_3, type Chapter3Lesson } from './lesson-content-chapter3';
import type { HodderLessonSlide } from './lesson-content-hodder-types';

/**
 * Cambridge practice is layered over the source-grounded Hodder lesson rather
 * than embedded into the textbook transcription itself. The target scope is
 * deliberately limited to the memory-family objectives covered by pp.70-74.
 */
export const CHAPTER_3_MEMORY_CHECKPOINT: HodderLessonSlide = {
  id: 'h3-cp-primary-memory',
  section: '3.1 Computers and their components',
  subtopicCode: '3.1',
  eyebrow: 'CAMBRIDGE CHECKPOINT · CURRENT 2026–2028 TARGET',
  title: 'Cambridge checkpoint: RAM/ROM, SRAM/DRAM and programmable ROM families',
  lead: 'Work through approved Cambridge 9618 questions matched to the current 2026–2028 learning objectives. Earlier papers are included only through explicit equivalent mappings; verified 2026 questions can match the current target directly.',
  learningObjectiveCodes: ['3.1.5', '3.1.6', '3.1.7'],
  checkpointLabel: '3.1.5 · 3.1.6 · 3.1.7',
  checkpointSyllabusCode: '9618',
  checkpointYearFrom: 2021,
  checkpointYearTo: 2026,
  sourcePages: [70, 71, 72, 74],
  sourceLabel: 'Hodder Chapter 3 · pp.70–74 · primary memory families',
  sourceElements: [
    'Figure 3.3 Structure of primary memory',
    'Table 3.1 Differences between DRAM and SRAM',
    'Table 3.2 Differences between RAM and ROM',
    'PROM and EPROM',
    'Solid state drives · EEPROM/NOR erase/read characteristics',
    'Explicit compatibility graph → approved 2021–2026 Cambridge past-paper leaves',
  ],
  examPractice: true,
  accent: 'rose',
};

function withMemoryCheckpoint(slides: readonly HodderLessonSlide[]) {
  const result: HodderLessonSlide[] = [];
  let inserted = false;

  for (const slide of slides) {
    result.push(slide);
    if (slide.id === 'h3-311-ram-rom') {
      result.push(CHAPTER_3_MEMORY_CHECKPOINT);
      inserted = true;
    }
  }

  if (!inserted) throw new Error('Chapter 3 memory checkpoint anchor h3-311-ram-rom is missing.');
  return result;
}

export const CHAPTER_3_FINAL: Chapter3Lesson = {
  ...CHAPTER_3,
  coverage: `${CHAPTER_3.coverage} · current 2026–2028 memory-family checkpoint queries approved 2021–2026 Cambridge papers through explicit LO compatibility`,
  slides: withMemoryCheckpoint(CHAPTER_3.slides),
};
