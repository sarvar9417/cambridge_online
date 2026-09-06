import { describe, expect, it } from 'vitest';
import { CHAPTER_7 } from './lesson-content-chapter7-complete';
import { CHAPTER_7_FINAL_SOURCE_SLIDES } from './chapter7-source-final-hardening';
import {
  CHAPTER_7_PAGE_SOURCE_ATOMS,
  CHAPTER_7_REQUIRED_KEY_TERMS,
  CHAPTER_7_SOURCE_INVENTORY_ATOMS,
} from './chapter7-source-atoms';
import {
  CHAPTER_7_ALL_SOURCE_ATOMS,
  CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES,
  CHAPTER_7_SOURCE_ATOM_COVERAGE,
} from './chapter7-source-atom-complete';
import { CHAPTER_7_SOURCE_MAP } from './chapter7-book-coverage';
import { CHAPTER_7_SOURCE_KEY_TERMS } from './chapter7-source-keyterms';
import { CHAPTER_7_SOURCE_ACTIVITY_ATOMS } from './chapter7-source-activity-atoms';
import { CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS } from './chapter7-source-pdf-detail';
import { sourceTeachingAtomsForChapter, sourceTeachingAtomsForSlide } from './lesson-source-teaching-model';

const text = (value: unknown) => JSON.stringify(value).toLowerCase()
  .replace(/\\\"/g, '"')
  .replace(/\\\\/g, '\\');
const sourceText=()=>text(sourceTeachingAtomsForChapter(7));

describe('0478 Chapter 7 source-atom parity with Chapters 1 and 13', () => {
  it('atom-audits every printed source page from 258 through 298', () => {
    const expectedPages = Array.from({ length: 41 }, (_, index) => 258 + index);
    const actualPages = [...new Set(CHAPTER_7_PAGE_SOURCE_ATOMS.map((atom) => atom.printedPage))].sort((a, b) => a - b);
    expect(actualPages).toEqual(expectedPages);
    expect([...new Set(sourceTeachingAtomsForChapter(7).map(atom=>atom.page))].sort((a,b)=>a-b)).toEqual(expectedPages);
    expect(CHAPTER_7_SOURCE_ATOM_COVERAGE.pages).toBe(41);
  });

  it('maps every source atom to a real book slide and to the visible teaching model', () => {
    const ids = new Set(CHAPTER_7_FINAL_SOURCE_SLIDES.map((slide) => slide.id));
    CHAPTER_7_ALL_SOURCE_ATOMS.forEach((atom) => {
      expect(ids.has(atom.targetSlideId), atom.id).toBe(true);
      const visible=sourceTeachingAtomsForSlide(7,atom.targetSlideId).find(item=>item.id===atom.id);
      expect(visible,`${atom.id} not teacher-visible`).toBeTruthy();
      expect(visible!.lines).toEqual(atom.needles);
    });
    expect(CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES).toHaveLength(CHAPTER_7_FINAL_SOURCE_SLIDES.length);
  });

  it('reconciles every named Activity, Figure, Table, exam question and book extra', () => {
    const byKindAndRef = new Set(CHAPTER_7_SOURCE_INVENTORY_ATOMS.map((atom) => `${atom.kind}:${atom.sourceRef}`));
    Object.keys(CHAPTER_7_SOURCE_MAP.activities).forEach((ref) => expect(byKindAndRef.has(`activity:Activity ${ref}`)).toBe(true));
    Object.keys(CHAPTER_7_SOURCE_MAP.figures).forEach((ref) => expect(byKindAndRef.has(`figure:Figure ${ref}`)).toBe(true));
    Object.keys(CHAPTER_7_SOURCE_MAP.tables).forEach((ref) => expect(byKindAndRef.has(`table:Table ${ref}`)).toBe(true));
    Object.keys(CHAPTER_7_SOURCE_MAP.examQuestions).forEach((ref) => expect(byKindAndRef.has(`exam:Exam-style Question ${ref}`)).toBe(true));
    Object.keys(CHAPTER_7_SOURCE_MAP.bookExtras).forEach((ref) => expect(CHAPTER_7_SOURCE_INVENTORY_ATOMS.some((atom) => atom.sourceRef === ref)).toBe(true));
    expect(CHAPTER_7_SOURCE_ATOM_COVERAGE.activities).toBe(20);
    expect(CHAPTER_7_SOURCE_ATOM_COVERAGE.figures).toBe(22);
    expect(CHAPTER_7_SOURCE_ATOM_COVERAGE.tables).toBe(6);
    expect(CHAPTER_7_SOURCE_ATOM_COVERAGE.examQuestions).toBe(9);
  });

  it('pins all 30 formal textbook key terms and their source definitions', () => {
    const page294 = text(CHAPTER_7_PAGE_SOURCE_ATOMS.filter((atom) => atom.printedPage === 294));
    const presenter = text(CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES);
    expect(CHAPTER_7_SOURCE_KEY_TERMS).toHaveLength(30);
    expect(CHAPTER_7_SOURCE_ATOM_COVERAGE.keyTerms).toBe(30);
    for (const term of CHAPTER_7_REQUIRED_KEY_TERMS) {
      expect(page294, term).toContain(term.toLowerCase());
      expect(sourceText(), term).toContain(term.toLowerCase());
    }
    for (const item of CHAPTER_7_SOURCE_KEY_TERMS) {
      expect(presenter, item.term).toContain(item.definition.toLowerCase());
    }
  });

  it('keeps exact values and prompts inside Activities 7.8–7.11, not just labels', () => {
    expect(CHAPTER_7_SOURCE_ACTIVITY_ATOMS).toHaveLength(4);
    const visible=sourceText();
    [
      'entering a telephone number',
      'entering a pupil’s name',
      'xxx999, when x must be a letter and 9 must be a digit',
      'normal test data: 50, 50, 50, 50, 50, 50, 50, 50, 50, 50',
      'expected result: 50',
      'erroneous/abnormal data: -12, eleven',
      'extreme data: 0, 100',
      'boundary data for 0: -1, 0',
      'end-of-term examinations are now marked out of 20',
    ].forEach((needle) => expect(visible, needle).toContain(needle));
  });

  it('preserves exact source terminology, values, examples and pseudocode fragments', () => {
    const visible=sourceText();
    [
      'requirements specification',
      'software · data · hardware · communications · people',
      '$20 per ticket',
      '10 tickets → 10% discount',
      '20 tickets → 20% discount',
      'studentname[counter]',
      'control variable may be used inside loop but its value must not be changed',
      'numberofbrothers <> div(numberofbrothers, 1)',
      'cub9999',
      '5327 vs 5307',
      '5037 vs 5307',
      '537 / 53107 vs 5307',
      '13 / thirteen vs 30 / thirty',
      'test data: 9, 7, 3, 12, 6, 4, 15, 2, 8, 5',
      'activity 7.13 test data: 4, 8, 19, 17, 3, 11, 6, 1, 13, 9',
      'activity 7.14 test data: 35, 31, 32, 36, 39, 37, 42, 38',
      '-97, 12390, 0, 77, 359, -2, -89, 5000, 21, 67',
      '600 students',
      'overallaverage ← overalltotal / 2400',
      'abstract data type (adt)',
      'stack = lifo',
      'queue = fifo',
      'stack pop removes 79',
      'queue dequeue removes 27',
    ].forEach((needle) => expect(visible, needle).toContain(needle));
  });

  it('preserves source-only sidebars, cross-links and the fifth life-cycle stage', () => {
    const visible=sourceText();
    expect(CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS.length).toBeGreaterThan(10);
    [
      'analysis, design, coding, testing and maintenance',
      'draw a structure diagram for cleaning your teeth',
      'for more on arrays see chapter 8',
      'find an isbn and show that its check digit is correct',
      'parity checks and checksums are used when data is transferred',
      'write and test programs for examples 1 and 2',
    ].forEach((needle) => expect(visible, needle).toContain(needle));
  });

  it('makes every Chapter 7 supplied-PDF detail atom teacher-visible', () => {
    const visible=sourceText();
    for(const atom of CHAPTER_7_SOURCE_PDF_DETAIL_ATOMS){
      atom.needles.forEach(needle=>expect(visible,`${atom.id}: ${needle}`).toContain(needle.toLowerCase()));
    }
  });

  it('preserves the full exam-style task data instead of only question identifiers', () => {
    const visible=sourceText();
    [
      'modulo 11 check digit for numbers from 4 to 20 digits in length',
      'up to 12 diners and bills from $10 to $500',
      'online form data: name · date of birth · password · phone number',
      'trace data: 15, 10, 20, 17, 32, 10, 30, 35, 30, 15, 30, 28, 25, 25, 20, 15, 40, 20, 12, 10',
      'until number < 0; total ← total + counter; counter ← counter + 1; output total; next number',
      'input data: 5, 7, +, 6, 2, -, 4, 3, *, 7, 8, ?, 0, 0, /',
      'paper 22 q3, june 2018',
      'routine stores contributor name, email address and password',
      'paper 22 q4, june 2018',
    ].forEach((needle) => expect(visible, needle).toContain(needle));
  });

  it('does not duplicate the source registry into authored YOUR TASK prompts',()=>{
    const presenter=text(CHAPTER_7_SOURCE_ATOM_COMPLETE_SLIDES);
    expect(presenter).not.toContain('· book source');
    expect(presenter).not.toContain('[chapter objectives · p.258]');
  });

  it('reports complete source and book inventory coverage on the actual lesson route', () => {
    expect(CHAPTER_7.coverage).toContain(`${CHAPTER_7_SOURCE_ATOM_COVERAGE.atoms}/${CHAPTER_7_SOURCE_ATOM_COVERAGE.atoms} source atoms pinned`);
    expect(CHAPTER_7.coverage).toContain(`${CHAPTER_7_SOURCE_ATOM_COVERAGE.sourcePdfDetailAtoms}/${CHAPTER_7_SOURCE_ATOM_COVERAGE.sourcePdfDetailAtoms} source-PDF detail atoms`);
    expect(CHAPTER_7.coverage).toContain('41/41 source pages atom-audited');
    expect(CHAPTER_7.coverage).toContain('30/30 formal key terms');
    expect(CHAPTER_7.coverage).toContain('20/20 activities');
    expect(CHAPTER_7.coverage).toContain('22/22 figures');
    expect(CHAPTER_7.coverage).toContain('6/6 tables');
    expect(CHAPTER_7.coverage).toContain('9/9 exam-style questions');
  });
});
