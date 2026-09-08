import type { LessonSlide } from './lesson-content-source-complete';

/** A classroom lesson should feel finite. Source-complete chapter routes can be
 * hundreds of presentation screens, so the UI groups them into small lessons
 * without deleting, re-ordering or rewriting any source-backed screen. */
export const MAX_LESSON_SCREENS = 14;

export type LessonUnit = {
  id: string;
  section: string;
  title: string;
  part: number;
  parts: number;
  slides: LessonSlide[];
};

const slug = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'lesson';

export function buildLessonUnits(
  slides: readonly LessonSlide[],
  maxScreens = MAX_LESSON_SCREENS,
): LessonUnit[] {
  if (!Number.isInteger(maxScreens) || maxScreens < 1) {
    throw new Error('maxScreens must be a positive integer');
  }

  const runs: Array<{ section: string; slides: LessonSlide[] }> = [];
  for (const slide of slides) {
    const section = slide.section?.trim() || 'Lesson';
    const last = runs[runs.length - 1];
    if (last?.section === section) last.slides.push(slide);
    else runs.push({ section, slides: [slide] });
  }

  const units: LessonUnit[] = [];
  for (const run of runs) {
    const parts = Math.ceil(run.slides.length / maxScreens);
    for (let partIndex = 0; partIndex < parts; partIndex += 1) {
      const lessonSlides = run.slides.slice(partIndex * maxScreens, (partIndex + 1) * maxScreens);
      units.push({
        id: `${slug(run.section)}-${String(partIndex + 1).padStart(2, '0')}-${lessonSlides[0]?.id ?? 'empty'}`,
        section: run.section,
        title: parts > 1 ? `${run.section} · Part ${partIndex + 1}` : run.section,
        part: partIndex + 1,
        parts,
        slides: lessonSlides,
      });
    }
  }

  return units;
}
