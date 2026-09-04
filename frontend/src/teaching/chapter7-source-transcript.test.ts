import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CHAPTER_7 as DISCOVERY_CHAPTER_7 } from './lesson-content-chapter7';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { CHAPTER_7_SOURCE_PAGE_AUDIT } from './chapter7-source-page-audit';
import { CHAPTER_7_SOURCE_TRANSCRIPT } from './chapter7-source-transcript';

const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

describe('Chapter 7 full source-text preservation', () => {
  it('preserves every printed source page from 258 through 298', () => {
    const expectedPages = Array.from({ length: 41 }, (_, index) => 258 + index);
    expect(CHAPTER_7_SOURCE_TRANSCRIPT.map((page) => page.printedPage)).toEqual(expectedPages);
    expect(CHAPTER_7_SOURCE_TRANSCRIPT.every((page) => page.text.trim().length > 0)).toBe(true);
  });

  it('protects every normalized source page with its SHA-256 fingerprint', () => {
    for (const page of CHAPTER_7_SOURCE_TRANSCRIPT) {
      expect(sha256(page.text), `printed p.${page.printedPage}`).toBe(page.sha256);
    }
  });

  it('keeps every source page connected to at least one real book slide', () => {
    const routeIds = new Set(CHAPTER_7.slides.map((slide) => slide.id));
    const auditedPages = CHAPTER_7_SOURCE_PAGE_AUDIT.map((page) => page.printedPage);
    expect(auditedPages).toEqual(Array.from({ length: 41 }, (_, index) => 258 + index));

    for (const page of CHAPTER_7_SOURCE_PAGE_AUDIT) {
      expect(
        page.targetSlideIds.some((id) => id.startsWith('ch7-book-') && routeIds.has(id)),
        `printed p.${page.printedPage}`,
      ).toBe(true);
    }
  });

  it('retains representative source wording across concepts, activities, figures, tables and exam pages', () => {
    const source = CHAPTER_7_SOURCE_TRANSCRIPT.map((page) => page.text).join('\n');
    [
      'requirements specification',
      '▲ Figure 7.1',
      'Activity 7.1',
      'Activity 7.20',
      '▼ Table 7.1',
      '▼ Table 7.6',
      'NumberOfBrothers <> DIV(NumberOfBrothers, 1)',
      'CUB9999',
      'OverallAverage ← OverallTotal / 2400',
      'Cambridge IGCSE Computer Science (0478) Paper 22 Q4, June 2018',
    ].forEach((needle) => expect(source, needle).toContain(needle));
  });

  it('does not replace or reorder the original guided-discovery lesson', () => {
    const originalIds = DISCOVERY_CHAPTER_7.slides.map((slide) => slide.id);
    expect(CHAPTER_7.slides.slice(0, originalIds.length).map((slide) => slide.id)).toEqual(originalIds);
    expect(CHAPTER_7.coverage).toContain('41/41 source text pages preserved');
  });
});
