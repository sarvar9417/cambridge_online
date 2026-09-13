import type { LessonPresentationBeat } from './lesson-experience-model';

/**
 * Compatibility shim for the old Chapter 2 lesson-frame import.
 *
 * Chapter 2 presentation sequencing is now owned by
 * `chapter2-presentation-storyboard.ts`. Keeping this identity function avoids
 * breaking older lesson-model imports while ensuring the retired h2n-* frame
 * system can no longer alter the source-backed presentation sequence.
 */
export function frameChapter2NetworkingPresentation(
  teaching: LessonPresentationBeat[],
  _appendix: LessonPresentationBeat[],
) {
  return teaching;
}

/** Retained only for backwards-compatible imports; no presentation uses it. */
export const CHAPTER_2_NETWORKING_LESSON_COUNT = 0;
