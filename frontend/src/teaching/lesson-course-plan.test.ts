import { describe, expect, it } from 'vitest';
import { LESSON_CHAPTERS } from './lesson-content-source-complete';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { buildLessonUnits, MAX_LESSON_SCREENS } from './lesson-course-plan';

const chapters = [...LESSON_CHAPTERS, CHAPTER_7];

describe('classroom lesson course structure', () => {
  it('preserves every source-backed screen exactly once and in source order', () => {
    for (const chapter of chapters) {
      const units = buildLessonUnits(chapter.slides);
      const plannedIds = units.flatMap((unit) => unit.slides.map((slide) => slide.id));
      expect(plannedIds, `chapter ${chapter.number} source order`).toEqual(chapter.slides.map((slide) => slide.id));
    }
  });

  it('never exposes a hundreds-of-pages classroom lesson', () => {
    for (const chapter of chapters) {
      const units = buildLessonUnits(chapter.slides);
      expect(units.length, `chapter ${chapter.number} lesson count`).toBeGreaterThan(0);
      units.forEach((unit) => {
        expect(unit.slides.length, unit.title).toBeGreaterThan(0);
        expect(unit.slides.length, unit.title).toBeLessThanOrEqual(MAX_LESSON_SCREENS);
      });
    }
  });

  it('actually splits at least one long source section into multiple classroom lessons', () => {
    expect(chapters.some((chapter) => buildLessonUnits(chapter.slides).some((unit) => unit.parts > 1))).toBe(true);
  });
});
