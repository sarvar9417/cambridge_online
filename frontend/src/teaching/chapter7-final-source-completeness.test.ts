import { describe, expect, it } from 'vitest';
import { CHAPTER_7_FINAL } from './lesson-content-chapter7-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 18 }, (_, index) => 178 + index);
const REQUIRED_SLIDES = [
  'h7-overview',
  'h7-71-foundations',
  'h7-711-computer-ethics',
  'h7-712-bcs-ieee',
  'h7-712-software-code',
  'h7-712-mikhail',
  'h7-713-public-impact',
  'h7-71-internet-debate',
  'h7-72-copyright-terms',
  'h7-721-software-copyright',
  'h7-722-drm',
  'h7-723-commercial-free-open',
  'h7-723-freeware-shareware',
  'h7-731-ai-definition',
  'h7-732-ai-impact',
  'h7-733-jobs-economy',
  'h7-733-environment',
  'h7-733-transport-justice',
  'h7-733-advertising-data',
  'h7-review-ethics-ai',
  'h7-review-code-classification',
] as const;

describe('Chapter 7 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 7 route and remains separate from legacy 0478 Chapter 7', () => {
    expect(lessonChapter(7)).toBe(CHAPTER_7_FINAL);
    expect(CHAPTER_7_FINAL.title).toBe('Ethics and ownership');
    expect(CHAPTER_7_FINAL.sourceNote).toContain('pp.178–195');
    expect(CHAPTER_7_FINAL.coverage).toContain('18/18 printed chapter pages');
    expect(CHAPTER_7_FINAL.slides.every(slide => slide.id.startsWith('h7-'))).toBe(true);
    expect(CHAPTER_7_FINAL.slides.every(slide => !slide.id.startsWith('ch7-'))).toBe(true);
  });

  it('represents every printed source page from 178 through 195', () => {
    const pages = new Set(CHAPTER_7_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps every source reference inside the exact Chapter 7 range', () => {
    for (const slide of CHAPTER_7_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(178);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(195);
      }
    }
  });

  it('preserves the source chapter structure and complete teaching sequence', () => {
    expect(CHAPTER_7_FINAL.subtopics).toEqual([
      '7.1 Legal, moral, ethical and cultural implications',
      '7.2 Copyright issues',
      '7.3 Artificial intelligence (AI)',
    ]);
    const ids = new Set(CHAPTER_7_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_SLIDES) expect(ids.has(id), id).toBe(true);
  });

  it('makes the high-value source distinctions explicit', () => {
    const allText = CHAPTER_7_FINAL.slides.map(slide => JSON.stringify(slide)).join(' ');
    expect(allText).toMatch(/legal/i);
    expect(allText).toMatch(/morality/i);
    expect(allText).toMatch(/ethics/i);
    expect(allText).toMatch(/culture/i);
    expect(allText).toMatch(/BCS/i);
    expect(allText).toMatch(/IEEE/i);
    expect(allText).toMatch(/ACM/i);
    expect(allText).toMatch(/digital rights management|DRM/i);
    expect(allText).toMatch(/commercial software/i);
    expect(allText).toMatch(/open-source/i);
    expect(allText).toMatch(/freeware/i);
    expect(allText).toMatch(/shareware/i);
    expect(allText).toMatch(/autonomous/i);
    expect(allText).toMatch(/environment/i);
    expect(allText).toMatch(/bias/i);
    expect(allText).toMatch(/advertising/i);
  });
});
