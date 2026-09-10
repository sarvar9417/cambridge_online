import { describe, expect, it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import {
  CHAPTER_2_KEY_TERMS_2_1,
  CHAPTER_2_KEY_TERMS_2_2,
  CHAPTER_2_SOURCE_EMPHASIS,
} from './chapter2-source-emphasis';
import {
  chapter2EmphasisBoardSlide,
  chapter2EmphasisBoardSlides,
  chapter2EssentialTermSlides21,
  chapter2EssentialTermSlides22,
} from './chapter2-essential-terms';
import { highlightChapter2Terms, isChapter2KeyTerm, isChapter2Slide } from './chapter2-term-highlight';

describe('Chapter 2 source emphasis baseline', () => {
  it('keeps the full formal key-term glossaries from the two coursebook key-terms blocks', () => {
    expect(CHAPTER_2_KEY_TERMS_2_1).toHaveLength(38);
    expect(CHAPTER_2_KEY_TERMS_2_2).toHaveLength(19);
    expect(CHAPTER_2_KEY_TERMS_2_1.every(item => item.definition.length > 10)).toBe(true);
    expect(CHAPTER_2_KEY_TERMS_2_1.every(item => item.simple.length > 10)).toBe(true);
    expect(CHAPTER_2_KEY_TERMS_2_2.every(item => item.definition.length > 10)).toBe(true);
    expect(CHAPTER_2_KEY_TERMS_2_2.every(item => item.simple.length > 10)).toBe(true);
  });

  it('pins required coursebook terms with exact book definitions', () => {
    const terms = new Map([...CHAPTER_2_KEY_TERMS_2_1, ...CHAPTER_2_KEY_TERMS_2_2].map(item => [item.term, item.definition]));
    expect(terms.get('Hub')).toContain('directs incoming data packets to all devices');
    expect(terms.get('Switch')).toContain('specific destination address only');
    expect(terms.get('Router')).toContain('routed between different networks');
    expect(terms.get('IPv4')).toBe('IP address format which uses 32 bits, such as 200.21.100.6.');
    expect(terms.get('Zero compression')).toContain('can only be applied once');
    expect(terms.get('Bridge')).toContain('SAME protocols');
    expect(terms.get('Gateway')).toContain('DIFFERENT protocols');
  });

  it('keeps bold-typography anchors on physical source pages', () => {
    expect(CHAPTER_2_SOURCE_EMPHASIS.length).toBeGreaterThan(150);
    for (const anchor of CHAPTER_2_SOURCE_EMPHASIS) {
      expect(anchor.page).toBeGreaterThan(0);
      expect(anchor.page).toBeLessThanOrEqual(41);
      expect(anchor.printedPage).toBe(anchor.page + 26);
      expect(anchor.text.length).toBeGreaterThan(1);
    }
  });

  it('retains the required coursebook emphasis anchors', () => {
    const texts = CHAPTER_2_SOURCE_EMPHASIS.map(item => item.text);
    for (const required of [
      'CSMA/CD', 'Bit streaming', 'buffering', 'bit rate', 'Fibre optic cables',
      'Figure 2.21', 'Table 2.8', 'mesh network topologies', 'flooding',
      'spread spectrum frequency hopping', 'zero compression', 'sub-netting',
      'ACTIVITY 2A', 'EXTENSION ACTIVITY 2F', 'Key terms',
    ]) expect(texts, `Missing Chapter 2 emphasis: ${required}`).toContain(required);
  });
});

describe('Chapter 2 essential-terms presentation route', () => {
  const finalSlides = CHAPTER_2_FINAL.slides;

  it('inserts essential-terms slides into the active chapter route before each checkpoint', () => {
    const essential = finalSlides.filter(slide => (slide as { essentialTerms?: boolean }).essentialTerms);
    expect(essential.length).toBe(chapter2EssentialTermSlides21().length + chapter2EssentialTermSlides22().length);

    const last21Id = chapter2EssentialTermSlides21().at(-1)?.id;
    const last21 = finalSlides.findIndex(slide => slide.id === last21Id);
    const checkpoint21 = finalSlides.findIndex(slide => slide.id === 'h2-cp-networking-full');
    expect(last21).toBeGreaterThan(-1);
    expect(checkpoint21).toBeGreaterThan(last21);

    const last22Id = chapter2EssentialTermSlides22().at(-1)?.id;
    const last22 = finalSlides.findIndex(slide => slide.id === last22Id);
    const checkpoint22 = finalSlides.findIndex(slide => slide.id === 'h2-cp-internet-full');
    expect(last22).toBeGreaterThan(-1);
    expect(checkpoint22).toBeGreaterThan(last22);
  });

  it('carries each exact definition and student-friendly explanation in one term card', () => {
    const slide = finalSlides.find(slide => slide.id === 'h2-terms-2-1-1');
    expect(slide?.keyTerms?.length).toBe(6);
    expect(slide?.keyTerms?.[0]?.term).toBe('ARPAnet');
    expect(slide?.keyTerms?.[0]?.definition).toContain(CHAPTER_2_KEY_TERMS_2_1[0]!.definition);
    expect(slide?.keyTerms?.[0]?.definition).toContain(CHAPTER_2_KEY_TERMS_2_1[0]!.simple);
  });

  it('splits the bold-emphasis audit into projector-safe screens before the chapter review', () => {
    const emphasis = finalSlides.filter(slide => (slide as { emphasisBoard?: boolean }).emphasisBoard);
    expect(emphasis).toHaveLength(chapter2EmphasisBoardSlides().length);
    expect(emphasis.every(slide => (slide.bullets?.length ?? 0) <= 7)).toBe(true);
    expect(emphasis[0]?.id).toBe('h2-emphasis-board-1');
    const board = chapter2EmphasisBoardSlide();
    expect(board.bullets?.length).toBeGreaterThan(20);
    expect(board.bullets?.some(line => line.startsWith('p.28 —'))).toBe(true);
    expect(board.bullets?.some(line => line.startsWith('p.54 —'))).toBe(true);
    const emphasisIndex = finalSlides.findIndex(slide => slide.id === 'h2-emphasis-board-1');
    const reviewIndex = finalSlides.findIndex(slide => slide.id === 'h2-review-terms');
    expect(emphasisIndex).toBeGreaterThan(-1);
    expect(reviewIndex).toBeGreaterThan(emphasisIndex);
  });

  it('keeps source provenance on every generated slide', () => {
    const generated = finalSlides.filter(slide =>
      (slide as { essentialTerms?: boolean }).essentialTerms
      || (slide as { emphasisBoard?: boolean }).emphasisBoard);
    for (const slide of generated) {
      expect(slide.sourcePages?.length).toBeGreaterThan(0);
      expect(slide.sourceLabel).toBeTruthy();
      expect(slide.sourceElements?.length).toBeGreaterThan(0);
    }
  });
});

describe('Chapter 2 term highlighting', () => {
  it('wraps coursebook terms in mark elements when enabled', () => {
    const nodes = highlightChapter2Terms('A hub broadcasts to all devices; a switch does not.', true);
    expect(nodes.some(node => typeof node === 'object')).toBe(true);
  });

  it('returns plain text when disabled or outside Chapter 2', () => {
    expect(highlightChapter2Terms('A hub broadcasts to all devices.', false)).toEqual(['A hub broadcasts to all devices.']);
    expect(isChapter2Slide('h2-217-switches')).toBe(true);
    expect(isChapter2Slide('h14-overview')).toBe(false);
    expect(isChapter2Slide('c1-11-01')).toBe(false);
  });

  it('matches single terms and boundary-safe fragments', () => {
    expect(isChapter2KeyTerm('Router')).toBe(true);
    expect(isChapter2KeyTerm('IPv6')).toBe(true);
    expect(isChapter2KeyTerm('routers')).toBe(false);
    expect(isChapter2KeyTerm('keyboard')).toBe(false);
    expect(highlightChapter2Terms('IPv6 improves on IPv4.', true).some(node => typeof node === 'object')).toBe(true);
  });
});
