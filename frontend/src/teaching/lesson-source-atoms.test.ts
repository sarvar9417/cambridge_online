import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';
import { COMPLETE_SOURCE_ATOMS, sourceAtomsForChapter } from './lesson-source-atom-registry';

const expectedPages = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

/** Normalize JSON escaping so source atoms containing quotes/backslashes are
 * compared to what the presenter actually renders, not JSON's wire encoding. */
const normalizeSerializedText = (value: unknown) => JSON.stringify(value)
  .replace(/\\\"/g, '"')
  .replace(/\\\\/g, '\\');

const slideText = (chapter: 1 | 13, slideId: string) => {
  const source = lessonChapter(chapter);
  expect(source, `Missing chapter ${chapter}`).toBeTruthy();
  const slide = source!.slides.find((item) => item.id === slideId);
  expect(slide, `Missing target slide ${slideId} for Chapter ${chapter}`).toBeTruthy();
  return { slide: slide!, text: normalizeSerializedText(slide) };
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

  it('pins every curated atom and all of its exact source needles to a real lesson slide', () => {
    for (const atom of COMPLETE_SOURCE_ATOMS) {
      const { slide, text } = slideText(atom.chapter, atom.targetSlideId);
      for (const needle of atom.needles) {
        expect(text, `${atom.id} is missing source value: ${needle}`).toContain(needle);
      }
      expect(slide.sourceElements?.some((item) => item.includes(atom.id)), `${atom.id} is not visible in source trace`).toBe(true);
    }
  });

  it('keeps exact source data in the collapsed activity drawer instead of flooding the main rich-block canvas', () => {
    for (const chapterNumber of [1, 13] as const) {
      const chapter = lessonChapter(chapterNumber)!;
      const atomSlideIds = new Set(sourceAtomsForChapter(chapterNumber).map((item) => item.targetSlideId));
      for (const slideId of atomSlideIds) {
        const slide = chapter.slides.find((item) => item.id === slideId)!;
        expect(slide.activity?.title).toMatch(/BOOK PRACTICE|SOURCE DETAIL/);
        expect(slide.activity?.prompt).toContain('Hodder p.');
        expect(JSON.stringify(slide.richBlocks ?? [])).not.toContain('SOURCE ATOM');
      }
    }
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
