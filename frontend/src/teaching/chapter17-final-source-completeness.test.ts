import { describe, expect, it } from 'vitest';
import { CHAPTER_17_FINAL } from './lesson-content-chapter17-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 15 }, (_, index) => 410 + index);

const REQUIRED_IDS = [
  'h17-1711-security-concerns',
  'h17-1711-plaintext-ciphertext',
  'h17-1712-symmetric-example',
  'h17-1712-key-distribution',
  'h17-1713-asymmetric',
  'h17-172-quantum-principles',
  'h17-172-qkd-stages',
  'h17-1731-ssl',
  'h17-1732-tls',
  'h17-173-handshake-pki',
  'h17-1741-signature-digest',
  'h17-1742-certificate',
  'h17-1742-self-signed',
  'h17-activity-review',
  'h17-review',
] as const;

describe('Chapter 17 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 17 route', () => {
    expect(lessonChapter(17)).toBe(CHAPTER_17_FINAL);
    expect(CHAPTER_17_FINAL.title).toBe('Security');
    expect(CHAPTER_17_FINAL.sourceNote).toContain('pp.410–424');
    expect(CHAPTER_17_FINAL.coverage).toContain('15/15 printed chapter pages');
  });

  it('represents every printed source page from 410 through 424', () => {
    const pages = new Set(CHAPTER_17_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps every provenance page inside the exact Chapter 17 range', () => {
    for (const slide of CHAPTER_17_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page).toBeGreaterThanOrEqual(410);
        expect(page).toBeLessThanOrEqual(424);
      }
    }
  });

  it('contains the full encryption, QKD, SSL/TLS and certificate route', () => {
    const ids = new Set(CHAPTER_17_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_IDS) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_17_FINAL.subtopics).toEqual([
      '17.1 Encryption',
      '17.2 Quantum cryptography',
      '17.3 Protocols',
      '17.4 Digital signatures and digital certificates',
    ]);
  });

  it('preserves source terminology and trust relationships', () => {
    const text = JSON.stringify(CHAPTER_17_FINAL).toLowerCase();
    for (const token of [
      'confidentiality', 'authenticity', 'integrity', 'non-repudiation',
      'plaintext', 'ciphertext', 'block cipher', 'stream cipher', 'block chaining',
      'symmetric encryption', 'key-distribution problem', 'asymmetric encryption',
      'public key', 'private key', 'quantum cryptography', 'qkd', 'qubit', 'bb84',
      'ssl', 'tls', 'record protocol', 'handshake protocol', 'session caching',
      'certificate authority', 'pki', 'digital signature', 'hashing', 'digest',
      'digital certificate', 'self-signed',
    ]) expect(text).toContain(token);
  });

  it('keeps source review material as study rather than live past-paper checkpoints', () => {
    const reviewSlides = CHAPTER_17_FINAL.slides.filter(slide => slide.section === 'Chapter review');
    expect(reviewSlides.length).toBe(2);
    expect(reviewSlides.every(slide => slide.examPractice !== true)).toBe(true);
  });
});
