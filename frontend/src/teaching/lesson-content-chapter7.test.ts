import { describe, expect, it } from 'vitest';
import { CHAPTER_7, CHAPTER_7_REVEAL_ID } from './lesson-content-chapter7';

const slideText = (slide: (typeof CHAPTER_7.slides)[number]) => [
  slide.section,
  slide.eyebrow,
  slide.title,
  slide.lead,
  ...(slide.bullets ?? []),
  ...(slide.keyTerms ?? []).flatMap((item) => [item.term, item.definition]),
  slide.teacherPrompt ?? '',
  slide.activity?.title ?? '',
  slide.activity?.prompt ?? '',
  slide.activity?.reveal ?? '',
].join(' ');

const formalTerms = [
  'analysis',
  'decomposition',
  'abstraction',
  'design',
  'structure diagram',
  'flowchart',
  'pseudocode',
  'coding',
  'testing',
];

const uzbekStudentFacingMarkers = [
  'guruh', 'savol', 'vazifa', 'javob', 'o‘quvchi', 'tizim', 'oshxona', 'qaytim',
  'narx', 'boshlash', 'tugatish', 'kerak emas', 'pul yetarli emas', 'so‘m',
];

describe('0478 Chapter 7 guided-discovery lesson', () => {
  it('keeps formal Cambridge terminology hidden until the reveal slide', () => {
    const revealIndex = CHAPTER_7.slides.findIndex((slide) => slide.id === CHAPTER_7_REVEAL_ID);
    expect(revealIndex).toBeGreaterThan(0);

    const beforeReveal = CHAPTER_7.slides.slice(0, revealIndex).map(slideText).join('\n').toLowerCase();
    for (const term of formalTerms) {
      expect(beforeReveal).not.toContain(term);
    }
  });

  it('reveals every required term after learners have completed the process', () => {
    const revealIndex = CHAPTER_7.slides.findIndex((slide) => slide.id === CHAPTER_7_REVEAL_ID);
    const afterReveal = CHAPTER_7.slides.slice(revealIndex).map(slideText).join('\n').toLowerCase();
    for (const term of formalTerms) {
      expect(afterReveal).toContain(term);
    }
  });

  it('keeps all slide content student-facing and English-only', () => {
    const value = CHAPTER_7.slides.map(slideText).join('\n').toLowerCase();
    for (const marker of uzbekStudentFacingMarkers) {
      expect(value).not.toContain(marker);
    }
    expect(value).not.toContain('discuss in groups');
    expect(value).not.toContain('discuss with your group');
  });

  it('uses explicit action instructions for every activity', () => {
    for (const slide of CHAPTER_7.slides) {
      if (!slide.activity) continue;
      expect(slide.activity.prompt.trim().length).toBeGreaterThan(20);
    }
  });

  it('covers the complete classroom journey from problem to correction and retest', () => {
    expect(CHAPTER_7.number).toBe(7);
    expect(CHAPTER_7.level).toBe('IGCSE');
    expect(CHAPTER_7.slides).toHaveLength(15);
    expect(CHAPTER_7.slides.map((slide) => slide.id)).toEqual([
      'ch7-01-challenge',
      'ch7-02-understand',
      'ch7-03-small-jobs',
      'ch7-04-filter',
      'ch7-05-hierarchy',
      'ch7-06-sequence',
      'ch7-07-shapes',
      'ch7-08-structured-text',
      'ch7-09-command-cards',
      'ch7-10-human-computer',
      'ch7-11-predict-check',
      'ch7-12-bug',
      'ch7-13-recap',
      'ch7-14-reveal',
      'ch7-15-cambridge-check',
    ]);
  });
});
