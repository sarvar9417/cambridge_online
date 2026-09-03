import { describe, expect, it } from 'vitest';
import { CHAPTER_7 as DISCOVERY_CHAPTER_7 } from './lesson-content-chapter7';
import { CHAPTER_7, CHAPTER_7_BOOK_START_ID, CHAPTER_7_DISCOVERY_SLIDE_COUNT } from './lesson-content-chapter7-complete';
import { CHAPTER_7_BOOK_SLIDES, CHAPTER_7_BOOK_SOURCE_COVERAGE } from './chapter7-book-content';
import { CHAPTER_7_SOURCE_MAP } from './chapter7-book-coverage';

const allText = (value: unknown) => JSON.stringify(value).toLowerCase();

describe('0478 Chapter 7 complete presenter route', () => {
  it('keeps the original 15-slide discovery lesson first and unchanged', () => {
    expect(CHAPTER_7_DISCOVERY_SLIDE_COUNT).toBe(15);
    expect(CHAPTER_7.slides.slice(0, 15)).toEqual(DISCOVERY_CHAPTER_7.slides);
    expect(CHAPTER_7.slides[15]?.id).toBe(CHAPTER_7_BOOK_START_ID);
    expect(CHAPTER_7_BOOK_START_ID).toBe('ch7-book-00-route');
  });

  it('appends the coursebook deep dive instead of replacing discovery content', () => {
    expect(CHAPTER_7_BOOK_SLIDES.length).toBeGreaterThan(50);
    expect(CHAPTER_7.slides.length).toBe(15 + CHAPTER_7_BOOK_SLIDES.length);
    expect(CHAPTER_7_BOOK_SLIDES.every((slide) => slide.id.startsWith('ch7-book-'))).toBe(true);
  });

  it('maps every Activity 7.1–7.20 to an existing presenter slide', () => {
    expect(Object.keys(CHAPTER_7_SOURCE_MAP.activities)).toEqual(CHAPTER_7_BOOK_SOURCE_COVERAGE.activities);
    const ids = new Set(CHAPTER_7_BOOK_SLIDES.map((slide) => slide.id));
    Object.values(CHAPTER_7_SOURCE_MAP.activities).forEach((id) => expect(ids.has(id)).toBe(true));
  });

  it('maps every Figure 7.1–7.22 and Table 7.1–7.6 to an existing presenter slide', () => {
    expect(Object.keys(CHAPTER_7_SOURCE_MAP.figures)).toEqual(CHAPTER_7_BOOK_SOURCE_COVERAGE.figures);
    expect(Object.keys(CHAPTER_7_SOURCE_MAP.tables)).toEqual(CHAPTER_7_BOOK_SOURCE_COVERAGE.tables);
    const ids = new Set(CHAPTER_7_BOOK_SLIDES.map((slide) => slide.id));
    [...Object.values(CHAPTER_7_SOURCE_MAP.figures), ...Object.values(CHAPTER_7_SOURCE_MAP.tables)]
      .forEach((id) => expect(ids.has(id)).toBe(true));
  });

  it('maps all nine end-of-chapter exam-style questions', () => {
    expect(Object.keys(CHAPTER_7_SOURCE_MAP.examQuestions)).toEqual(CHAPTER_7_BOOK_SOURCE_COVERAGE.examQuestions);
    const ids = new Set(CHAPTER_7_BOOK_SLIDES.map((slide) => slide.id));
    Object.values(CHAPTER_7_SOURCE_MAP.examQuestions).forEach((id) => expect(ids.has(id)).toBe(true));
  });

  it('covers all nine numbered chapter sections', () => {
    const codes = new Set(CHAPTER_7_BOOK_SLIDES.map((slide) => slide.subtopicCode).filter(Boolean));
    CHAPTER_7_BOOK_SOURCE_COVERAGE.sections.forEach((code) => expect(codes.has(code)).toBe(true));
  });

  it('keeps the appended student-facing book content English-only', () => {
    const text = allText(CHAPTER_7_BOOK_SLIDES);
    const forbiddenUzbekMarkers = ['o‘quvchi','tizim','vazifa','savol','javob','qaytim','kerak emas','boshlash','tugatish','guruh'];
    forbiddenUzbekMarkers.forEach((marker) => expect(text).not.toContain(marker));
  });

  it('contains the major source concepts and extension topics', () => {
    const text = allText(CHAPTER_7_BOOK_SLIDES);
    [
      'stepwise refinement','input','process','output','storage','structure diagram','flowchart','pseudocode',
      'linear search','bubble sort','range check','length check','type check','presence check','format check','check digit',
      'double entry','screen/visual check','normal data','abnormal','extreme','boundary','trace table','dry run','stack','queue',
    ].forEach((term) => expect(text).toContain(term));
  });
});
