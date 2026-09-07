import { describe, expect, it } from 'vitest';
import { lessonChapter, type LessonSlide } from './lesson-content-source-complete';
import { COMPLETE_SOURCE_ATOMS, sourceAtomsForChapter } from './lesson-source-atom-registry';
import { studentFacingSlide } from './lesson-student-facing';

const expectedPages = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

const targetSlide = (chapter: 1 | 13, slideId: string) => {
  const source = lessonChapter(chapter);
  expect(source, `Missing chapter ${chapter}`).toBeTruthy();
  const slide = source!.slides.find((item) => item.id === slideId);
  expect(slide, `Missing target slide ${slideId} for Chapter ${chapter}`).toBeTruthy();
  return slide!;
};

describe('source atom registry', () => {
  it('uses unique atom ids', () => {
    const ids = COMPLETE_SOURCE_ATOMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('atom-audits every uploaded Chapter 1 page', () => {
    const pages = [...new Set(sourceAtomsForChapter(1).map((item) => item.page))].sort((a, b) => a - b);
    expect(pages).toEqual(expectedPages(26));
    expect(lessonChapter(1)!.coverage).toContain('26/26 atom-audited pages');
  });

  it('atom-audits every uploaded Chapter 13 page', () => {
    const pages = [...new Set(sourceAtomsForChapter(13).map((item) => item.page))].sort((a, b) => a - b);
    expect(pages).toEqual(expectedPages(24));
    expect(lessonChapter(13)!.coverage).toContain('24/24 atom-audited pages');
  });

  it('pins every curated atom and all exact lines to teacher/system source evidence', () => {
    for (const atom of COMPLETE_SOURCE_ATOMS) {
      const slide = targetSlide(atom.chapter, atom.targetSlideId);
      const evidence = slide.sourceAtomEvidence?.find((item) => item.id === atom.id);
      expect(evidence, `${atom.id} is missing sourceAtomEvidence`).toBeTruthy();
      expect(evidence?.sourceRef).toBe(atom.sourceRef);
      expect(evidence?.page).toBe(atom.page);
      expect(evidence?.kind).toBe(atom.kind);
      expect(evidence?.lines).toEqual(atom.needles);
      expect(slide.sourceElements?.some((item) => item.includes(atom.id)), `${atom.id} is not visible in source trace`).toBe(true);
    }
  });

  it('does not flatten source metadata or concept atoms into learner activity prompts', () => {
    for (const chapterNumber of [1, 13] as const) {
      const chapter = lessonChapter(chapterNumber)!;
      for (const sourceSlide of chapter.slides) {
        const slide = studentFacingSlide(sourceSlide as LessonSlide);
        expect(slide.activity?.title ?? '').not.toMatch(/^(?:BOOK PRACTICE|SOURCE DETAIL)\b|exact (?:Hodder|The coursebook)/i);
        expect(slide.activity?.prompt ?? '').not.toMatch(/\[.+(?:Hodder|The coursebook) p\.\d+\]|SOURCE ATOM|In this chapter, you will learn about/i);
      }
    }
  });

  it('projects the Chapter 1 prior check as two clear tasks while keeping chapter objectives out of the task', () => {
    const source = targetSlide(1, 'h1-prior');
    const slide = studentFacingSlide(source as LessonSlide);
    const learnerText = JSON.stringify({ activity: slide.activity, richBlocks: slide.richBlocks });

    expect(slide.activity?.title).toBe('Prior knowledge check');
    expect(slide.activity?.prompt).toContain('2 prior-knowledge tasks');
    expect(learnerText).toContain('Prior knowledge · Q2');
    expect(learnerText).toContain('00110101 + 01001000');
    expect(learnerText).toContain('Prior knowledge · Q4');
    expect(learnerText).toContain('107 + 257');
    expect(learnerText).not.toContain('In this chapter, you will learn about');
    expect(learnerText).not.toContain('Chapter source scope:');

    const objectives = source.sourceAtomEvidence?.find((item) => item.id === 'ch1-p1-file-objectives');
    expect(objectives?.lines).toContain('binary magnitudes, binary prefixes and decimal prefixes');
  });

  it('pins all Hodder activity and extension families instead of title-only summaries', () => {
    const ch1Refs = sourceAtomsForChapter(1).map((item) => item.sourceRef);
    for (const letter of 'ABCDEFGHI') expect(ch1Refs.some((ref) => ref.includes(`Activity 1${letter}`))).toBe(true);
    for (const letter of 'ABCD') expect(ch1Refs.some((ref) => ref.includes(`Extension Activity 1${letter}`))).toBe(true);

    const ch13Refs = sourceAtomsForChapter(13).map((item) => item.sourceRef);
    for (const letter of 'ABCDEFGHI') expect(ch13Refs.some((ref) => ref.includes(`Activity 13${letter}`))).toBe(true);
    for (const letter of 'ABCDEF') expect(ch13Refs.some((ref) => ref.includes(`Extension Activity 13${letter}`))).toBe(true);
  });

  it('pins all Hodder worked-example families and chapter-review groups', () => {
    const ch1Refs = sourceAtomsForChapter(1).map((item) => item.sourceRef);
    for (let number = 1; number <= 8; number += 1) {
      expect(ch1Refs.some((ref) => ref.includes(`Example 1.${number}`))).toBe(true);
    }
    expect(sourceAtomsForChapter(1).filter((item) => item.kind === 'review').length).toBeGreaterThanOrEqual(6);

    const ch13Refs = sourceAtomsForChapter(13).map((item) => item.sourceRef);
    for (let number = 1; number <= 9; number += 1) {
      expect(ch13Refs.some((ref) => ref.includes(`Example 13.${number}`))).toBe(true);
    }
    expect(sourceAtomsForChapter(13).filter((item) => item.kind === 'review').length).toBeGreaterThanOrEqual(5);
  });
});
