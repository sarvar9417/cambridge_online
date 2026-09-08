import { describe, expect, it } from 'vitest';
import { CHAPTER_7 as DISCOVERY_CHAPTER_7 } from './lesson-content-chapter7';
import { CHAPTER_7, CHAPTER_7_BOOK_START_ID, CHAPTER_7_DISCOVERY_SLIDE_COUNT } from './lesson-content-chapter7-complete';
import { CHAPTER_7_BOOK_SLIDES, CHAPTER_7_BOOK_SOURCE_COVERAGE } from './chapter7-book-content';
import { CHAPTER_7_SOURCE_MAP } from './chapter7-book-coverage';
import { CHAPTER_7_PAST_PAPER_CHECKPOINTS } from './chapter7-past-paper-checkpoints';
import { CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES, CHAPTER_7_COURSEBOOK_PAGE_SLIDES } from './coursebook-page-slides';
import { pdfFirstBlocksForSection, pdfFirstSectionsForChapter } from './pdf-first-source-index';

const allText = (value: unknown) => JSON.stringify(value).toLowerCase();

describe('0478 Chapter 7 complete presenter route', () => {
  it('keeps the original 15-slide discovery lesson first and unchanged', () => {
    expect(CHAPTER_7_DISCOVERY_SLIDE_COUNT).toBe(15);
    expect(CHAPTER_7.slides.slice(0, 15)).toEqual(DISCOVERY_CHAPTER_7.slides);
    expect(CHAPTER_7.slides[15]?.id).toBe(CHAPTER_7_BOOK_START_ID);
    expect(CHAPTER_7_BOOK_START_ID).toBe('ch7-book-00-route');
  });

  it('uses the coursebook deep dive inside 7.1–7.9 and keeps page/glossary projections out of the active route', () => {
    expect(CHAPTER_7_BOOK_SLIDES.length).toBeGreaterThan(50);
    expect(CHAPTER_7_PAST_PAPER_CHECKPOINTS).toHaveLength(9);
    expect(CHAPTER_7_COURSEBOOK_GLOSSARY_SLIDES).toHaveLength(3);
    expect(CHAPTER_7_COURSEBOOK_PAGE_SLIDES).toHaveLength(41);
    expect(CHAPTER_7_BOOK_SLIDES.every((slide) => slide.id.startsWith('ch7-book-'))).toBe(true);
    expect(CHAPTER_7.slides.some(slide=>slide.section==='Coursebook glossary'||slide.section==='Coursebook page-by-page')).toBe(false);
    expect(CHAPTER_7.slides.some(slide=>slide.id.startsWith('ch7-source-page-')||slide.id.startsWith('ch7-coursebook-glossary-'))).toBe(false);
    const exactBlocks=CHAPTER_7.slides
      .filter(slide=>slide.id.startsWith('pdf-first-7')&&!slide.id.startsWith('pdf-first-lens-'))
      .flatMap(slide=>slide.bullets??[]);
    const expected=pdfFirstSectionsForChapter(7).flatMap(meta=>pdfFirstBlocksForSection(meta.id));
    expect(exactBlocks).toEqual(expected);
  });

  it('places one checkpoint after the final source/Exam-Lens sequence for each 7.1–7.9 section', () => {
    for (const checkpoint of CHAPTER_7_PAST_PAPER_CHECKPOINTS) {
      const checkpointIndex = CHAPTER_7.slides.findIndex((slide) => slide.id === checkpoint.id);
      expect(checkpointIndex).toBeGreaterThan(15);
      const previous = CHAPTER_7.slides[checkpointIndex - 1];
      const next = CHAPTER_7.slides[checkpointIndex + 1];
      expect(previous?.subtopicCode).toBe(checkpoint.subtopicCode);
      expect(previous?.id).toBe(`pdf-first-lens-${checkpoint.subtopicCode!.replace('.','')}`);
      expect(next?.subtopicCode).not.toBe(checkpoint.subtopicCode);
    }
  });

  it('uses only current 2026–2028 0478 LO targets and never bypasses compatibility with historical LO codes', () => {
    const byCode = new Map(CHAPTER_7_PAST_PAPER_CHECKPOINTS.map((slide) => [slide.subtopicCode, slide]));
    for(let index=1;index<=9;index+=1){
      expect(byCode.get(`7.${index}`)?.learningObjectiveCodes).toEqual([`7-lo-0${index}`]);
    }
    CHAPTER_7_PAST_PAPER_CHECKPOINTS.forEach((slide) => {
      expect(slide.checkpointSyllabusCode).toBe('0478');
      expect(slide.checkpointYearTo).toBe(2026);
      expect(slide.examPractice).toBe(true);
      expect(slide.learningObjectiveCodes?.some(code=>code.startsWith('2.1.'))).toBe(false);
      expect(slide.sourceElements).toContain('Explicit historical LO compatibility');
    });
    expect(byCode.get('7.1')?.checkpointYearFrom).toBe(2023);
    expect(byCode.get('7.2')?.checkpointYearFrom).toBe(2015);
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

  it('keeps the student-facing book, exact source and 0478 checkpoint content English-only', () => {
    const text = allText(CHAPTER_7.slides.slice(15));
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
