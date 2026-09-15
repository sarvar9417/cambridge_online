import { describe, expect, it } from 'vitest';
import { CHAPTER_6_FINAL } from './lesson-content-chapter6-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 19 }, (_, index) => 159 + index);
const REQUIRED_SLIDES = [
  'h6-overview',
  'h6-611-privacy',
  'h6-612-accounts-passwords',
  'h6-612-signatures-firewall',
  'h6-612-antimalware-encryption-biometrics',
  'h6-613-biometric-hacking-malware',
  'h6-613-malware-phishing',
  'h6-613-pharming',
  'h6-614-recovery',
  'h6-61-activity',
  'h6-62-integrity-overview',
  'h6-621-validation',
  'h6-622-entry-verification',
  'h6-622-modulo11-checksum',
  'h6-622-parity',
  'h6-622-parity-block',
  'h6-622-arq',
  'h6-62-activity',
  'h6-review',
] as const;

describe('Chapter 6 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 6 route', () => {
    expect(lessonChapter(6)).toBe(CHAPTER_6_FINAL);
    expect(CHAPTER_6_FINAL.title).toBe('Security, privacy and data integrity');
    expect(CHAPTER_6_FINAL.sourceNote).toContain('pp.159–177');
    expect(CHAPTER_6_FINAL.coverage).toContain('19/19 printed chapter pages');
  });

  it('represents every printed source page from 159 through 177', () => {
    const pages = new Set(CHAPTER_6_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps every source reference inside the exact Chapter 6 range', () => {
    for (const slide of CHAPTER_6_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(159);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(177);
      }
    }
  });

  it('contains the complete security, recovery, validation and verification teaching sequence', () => {
    const ids = new Set(CHAPTER_6_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_SLIDES) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_6_FINAL.subtopics).toEqual(['6.1 Data security', '6.2 Data integrity']);
  });

  it('makes the high-value source distinctions explicit', () => {
    const allText = CHAPTER_6_FINAL.slides.map(slide => JSON.stringify(slide)).join(' ');
    expect(allText).toMatch(/authentication/i);
    expect(allText).toMatch(/phishing/i);
    expect(allText).toMatch(/pharming/i);
    expect(allText).toMatch(/DNS cache poisoning/i);
    expect(allText).toMatch(/validation/i);
    expect(allText).toMatch(/verification/i);
    expect(allText).toMatch(/modulo-11/i);
    expect(allText).toMatch(/checksum/i);
    expect(allText).toMatch(/parity block/i);
    expect(allText).toMatch(/automatic repeat request/i);
  });
});
