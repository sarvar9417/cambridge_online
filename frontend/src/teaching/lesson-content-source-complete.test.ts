import { describe, expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';

const text = (chapter: NonNullable<ReturnType<typeof lessonChapter>>) =>
  chapter.slides.map((slide) => [
    slide.eyebrow,
    slide.title,
    slide.lead,
    ...(slide.bullets ?? []),
    ...(slide.keyTerms ?? []).flatMap((item) => [item.term, item.definition]),
    slide.formula ?? '',
    slide.activity?.prompt ?? '',
    slide.activity?.reveal ?? '',
  ].join(' ')).join('\n');

describe('source-audited Hodder lessons', () => {
  it('covers every Chapter 1 coursebook section and its core concepts', () => {
    const chapter = lessonChapter(1)!;
    const sourceMap = chapter.slides.find((slide) => slide.id === 'c1-source-map');
    expect(sourceMap).toBeTruthy();
    const value = text(chapter);
    for (const marker of ['1.1.1–1.1.2', '1.1.3–1.1.5', '1.2.1–1.2.2', '1.2.3–1.2.4', '1.3.1', '1.3.2']) {
      expect(value).toContain(marker);
    }
    for (const concept of ['Binary-Coded Decimal', 'ASCII', 'Unicode', 'bitmap', 'Vector', 'sampling', 'compression']) {
      expect(value.toLowerCase()).toContain(concept.toLowerCase());
    }
    expect(value).toContain('Reduce unwanted noise');
    expect(value.toLowerCase()).toContain('frame rate');
  });

  it('covers the Chapter 13 structure and precision/range reasoning', () => {
    const chapter = lessonChapter(13)!;
    const value = text(chapter);
    const lower = value.toLowerCase();
    for (const marker of ['13.1.1', '13.1.2', '13.2.1', '13.2.2', '13.3.1']) {
      expect(value).toContain(marker);
    }
    expect(value).toContain('address = fileStart + (slot × recordSize)');
    expect(lower).toContain('largest positive');
    expect(lower).toContain('smallest positive non-zero');
    expect(lower).toContain('underflow');
    expect(lower).toContain('overflow');
    expect(lower).toContain('rounding');
  });

  it('uses Hodder open/closed hashing terminology exactly', () => {
    const chapter = lessonChapter(13)!;
    const collision = chapter.slides.find((slide) => slide.id === 'c13-12-09');
    expect(collision).toBeTruthy();
    const terms = collision!.keyTerms!;
    expect(terms.find((item) => item.term.startsWith('Open hash'))?.definition)
      .toContain('following file locations');
    expect(terms.find((item) => item.term.startsWith('Closed hash'))?.definition)
      .toContain('overflow area');
  });

  it('keeps a live Cambridge checkpoint for every taught syllabus subtopic', () => {
    for (const chapterNo of [1, 13]) {
      const chapter = lessonChapter(chapterNo)!;
      const expected = chapterNo === 1 ? ['1.1', '1.2', '1.3'] : ['13.1', '13.2', '13.3'];
      for (const code of expected) {
        expect(chapter.slides.some((slide) => slide.subtopicCode === code && slide.examPractice)).toBe(true);
      }
    }
  });
});
