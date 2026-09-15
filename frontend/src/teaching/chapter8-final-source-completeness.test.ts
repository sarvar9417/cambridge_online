import { describe, expect, it } from 'vitest';
import { CHAPTER_8_FINAL } from './lesson-content-chapter8-deep-final';
import { lessonChapter } from './lesson-content-source-complete';

const EXPECTED_PAGES = Array.from({ length: 21 }, (_, index) => 196 + index);

const REQUIRED_SLIDES = [
  'h8-811-limitations',
  'h8-812-database-approach',
  'h8-813-keys',
  'h8-813-relationships',
  'h8-814-er-cardinality',
  'h8-815-normalisation-rules',
  'h8-815-1nf',
  'h8-815-2nf',
  'h8-815-3nf',
  'h8-815-final-design',
  'h8-821-dbms-limitations',
  'h8-821-dictionary-security',
  'h8-822-query-processor',
  'h8-831-ddl-dml',
  'h8-832-ddl',
  'h8-833-query-dml',
  'h8-833-maintenance-dml',
  'h8-review-normalisation',
  'h8-review-dbms-sql',
] as const;

describe('Chapter 8 deep source-complete lesson', () => {
  it('is the active Cambridge 9618 Chapter 8 route', () => {
    expect(lessonChapter(8)).toBe(CHAPTER_8_FINAL);
    expect(CHAPTER_8_FINAL.title).toBe('Databases');
    expect(CHAPTER_8_FINAL.sourceNote).toContain('pp.196–216');
    expect(CHAPTER_8_FINAL.coverage).toContain('21/21 printed chapter pages');
  });

  it('represents every printed source page from 196 through 216', () => {
    const pages = new Set(CHAPTER_8_FINAL.slides.flatMap(slide => slide.sourcePages ?? []));
    expect([...pages].sort((a, b) => a - b)).toEqual(EXPECTED_PAGES);
  });

  it('keeps all slide provenance inside the exact Chapter 8 range', () => {
    for (const slide of CHAPTER_8_FINAL.slides) {
      expect(slide.sourcePages?.length ?? 0, slide.id).toBeGreaterThan(0);
      for (const page of slide.sourcePages ?? []) {
        expect(page, `${slide.id} lower bound`).toBeGreaterThanOrEqual(196);
        expect(page, `${slide.id} upper bound`).toBeLessThanOrEqual(216);
      }
    }
  });

  it('contains the complete database-design, DBMS and SQL teaching route', () => {
    const ids = new Set(CHAPTER_8_FINAL.slides.map(slide => slide.id));
    for (const id of REQUIRED_SLIDES) expect(ids.has(id), id).toBe(true);
    expect(CHAPTER_8_FINAL.subtopics).toEqual([
      '8.1 Database concepts',
      '8.2 Database management systems (DBMSs)',
      '8.3 Data definition language (DDL) and data manipulation language (DML)',
    ]);
  });

  it('preserves the chapter terminology and source examples needed for Cambridge teaching', () => {
    const text = JSON.stringify(CHAPTER_8_FINAL).toLowerCase();
    for (const token of [
      'data redundancy', 'data inconsistency', 'data dependency',
      'Candidate key', 'Primary key', 'Foreign key', 'Referential integrity',
      'cardinality', '1NF', '2NF', '3NF', 'Composite key',
      'data dictionary', 'logical schema', 'query processor',
      'CREATE DATABASE', 'CREATE TABLE', 'ALTER TABLE',
      'SELECT', 'WHERE', 'ORDER BY', 'INNER JOIN', 'SUM', 'COUNT', 'AVG',
      'INSERT INTO', 'DELETE FROM', 'UPDATE',
    ]) expect(text).toContain(token.toLowerCase());
  });

  it('keeps the fully normalised school relation set explicit', () => {
    const slide = CHAPTER_8_FINAL.slides.find(item => item.id === 'h8-815-final-design')!;
    const text = JSON.stringify(slide);
    for (const relation of ['STUDENT(', 'CLASS(', 'TEACHER(', 'STUDENTSUBJECT(', 'SUBJECT(']) {
      expect(text).toContain(relation);
    }
  });
});
