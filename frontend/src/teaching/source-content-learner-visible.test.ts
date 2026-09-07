import { describe, expect, it } from 'vitest';
import { BOOK_COMPLETENESS_BASELINES } from './book-completeness-baseline';
import { lessonChapter, type LessonSlide } from './lesson-content-source-complete';
import { sourceAtomsForChapter, type LessonSourceAtom } from './lesson-source-atom-registry';
import { CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES, CHAPTER_7_ALL_SOURCE_ATOMS } from './chapter7-source-atom-complete';
import { CHAPTER_7_SOURCE_KEY_TERMS } from './chapter7-source-keyterms';

const normalize = (value: string) => value
  .toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[–—]/g, '-')
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, '\\')
  .replace(/\s+/g, ' ')
  .trim();

const stripPrintedHeading = (atom: LessonSourceAtom, line: string) => {
  const value = line.trim();
  for (const separator of [' · ', ': ']) {
    const prefix = `${atom.sourceRef}${separator}`;
    if (value.toLowerCase().startsWith(prefix.toLowerCase())) return value.slice(prefix.length).trim();
  }
  return value;
};

const visibleSlideText = (slide: LessonSlide) => normalize(JSON.stringify({
  title: slide.title,
  lead: slide.lead,
  bullets: slide.bullets,
  keyTerms: slide.keyTerms,
  formula: slide.formula,
  example: slide.example,
  activity: slide.activity,
  richBlocks: slide.richBlocks,
}));

const wholeChapterVisibleText = (slides: LessonSlide[]) => normalize(JSON.stringify(slides.map((slide) => ({
  title: slide.title,
  lead: slide.lead,
  bullets: slide.bullets,
  keyTerms: slide.keyTerms,
  formula: slide.formula,
  example: slide.example,
  activity: slide.activity,
  richBlocks: slide.richBlocks,
}))));

describe('supplied PDF content is learner-visible, not only audit-visible', () => {
  for (const chapterNumber of [1, 13] as const) {
    it(`renders every inventoried Chapter ${chapterNumber} source atom on its actual lesson screen`, () => {
      const chapter = lessonChapter(chapterNumber)!;
      const atoms = sourceAtomsForChapter(chapterNumber);
      expect(atoms.length).toBeGreaterThan(0);

      for (const atom of atoms) {
        const slide = chapter.slides.find((item) => item.id === atom.targetSlideId) as LessonSlide | undefined;
        expect(slide, `Missing lesson screen for ${atom.id}`).toBeTruthy();
        const visible = visibleSlideText(slide!);
        for (const sourceLine of atom.needles) {
          const expected = normalize(stripPrintedHeading(atom, sourceLine));
          expect(expected, `${atom.id} has an empty source line`).toBeTruthy();
          expect(visible, `${atom.id} is audit-only; learner cannot see: ${sourceLine}`).toContain(expected);
        }
      }
    });

    it(`renders the complete formal Chapter ${chapterNumber} key-term inventory with definitions`, () => {
      const chapter = lessonChapter(chapterNumber)!;
      const terms = chapter.slides.flatMap((slide) => slide.keyTerms ?? []);
      const termNames = new Set(terms.map((item) => normalize(item.term)));
      const baseline = BOOK_COMPLETENESS_BASELINES[chapterNumber].keyTerms;

      for (const term of baseline) {
        expect(termNames.has(normalize(term)), `Missing learner-visible key term: ${term}`).toBe(true);
        const item = terms.find((candidate) => normalize(candidate.term) === normalize(term));
        expect(item?.definition.trim().length, `Missing definition for ${term}`).toBeGreaterThan(0);
      }
      expect(termNames.size).toBeGreaterThanOrEqual(baseline.length);
    });

    it(`keeps every Chapter ${chapterNumber} semantic emphasis anchor learner-visible`, () => {
      const chapter = lessonChapter(chapterNumber)!;
      const visible = wholeChapterVisibleText(chapter.slides as LessonSlide[]);
      for (const anchor of BOOK_COMPLETENESS_BASELINES[chapterNumber].semanticEmphasisAnchors) {
        expect(visible, `Missing emphasised source concept: ${anchor}`).toContain(normalize(anchor));
      }
    });
  }

  it('renders every Chapter 7 source atom as normal visible lesson content', () => {
    const slides = new Map(CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES.map((slide) => [slide.id, slide]));
    for (const atom of CHAPTER_7_ALL_SOURCE_ATOMS) {
      const slide = slides.get(atom.targetSlideId);
      expect(slide, `Missing Chapter 7 lesson screen for ${atom.id}`).toBeTruthy();
      const visible = visibleSlideText(slide!);
      expect(visible, `${atom.id} is missing its source label`).toContain(normalize(atom.sourceRef));
      for (const sourceLine of atom.needles) {
        expect(visible, `${atom.id} is audit-only; learner cannot see: ${sourceLine}`).toContain(normalize(sourceLine));
      }
    }
  });

  it('renders all 30 Chapter 7 formal key terms with their source definitions', () => {
    const terms = CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES.flatMap((slide) => slide.keyTerms ?? []);
    const byName = new Map(terms.map((item) => [normalize(item.term), item]));
    expect(CHAPTER_7_SOURCE_KEY_TERMS).toHaveLength(30);
    for (const expected of CHAPTER_7_SOURCE_KEY_TERMS) {
      const actual = byName.get(normalize(expected.term));
      expect(actual, `Missing Chapter 7 key term ${expected.term}`).toBeTruthy();
      expect(normalize(actual!.definition)).toBe(normalize(expected.definition));
    }
  });

  it('keeps every Chapter 7 semantic emphasis anchor learner-visible', () => {
    const visible = wholeChapterVisibleText(CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES);
    for (const anchor of BOOK_COMPLETENESS_BASELINES[7].semanticEmphasisAnchors) {
      expect(visible, `Missing Chapter 7 emphasised source concept: ${anchor}`).toContain(normalize(anchor));
    }
  });
});
