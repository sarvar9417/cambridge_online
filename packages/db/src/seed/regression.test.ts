import { describe, expect, it } from 'vitest';
import { validateExtraction } from '@campath/shared';
import { PAPER as P11 } from './paper-9618-s23-11.js';
import { PAPER as P12 } from './paper-9618-s23-12.js';
import { PAPER as P13 } from './paper-9618-s23-13.js';
import { flatten, transcriptToValidationContext } from './transcript-to-validation.js';

/**
 * The 23 validation rules run against three real Cambridge papers.
 *
 * These transcripts are the same 9618/11, /12 and /13 May/June 2023 papers the
 * model pipeline will later read, but transcribed by hand. That makes them a
 * regression baseline in both directions: a rule that fires here is either a
 * real defect in the transcript or a rule that is too strict, and when the
 * pipeline runs its output can be diffed against the same source of truth.
 *
 * Paper 1 is 75 marks (`components.total_marks`).
 */
const PAPERS = [
  { name: '9618/11/M/J/23', paper: P11 },
  { name: '9618/12/M/J/23', paper: P12 },
  { name: '9618/13/M/J/23', paper: P13 },
];

const COMPONENT_TOTAL = 75;

describe.each(PAPERS)('$name', ({ paper }) => {
  const context = transcriptToValidationContext({
    papers: [paper],
    componentTotalMarks: COMPONENT_TOTAL,
    year: 2023,
  });
  const report = validateExtraction(context);
  const leaves = context.questions.filter(
    (question) => !context.questions.some((other) => other.parentPath === question.path),
  );

  it('V02: leaf marks total the component maximum', () => {
    const total = leaves.reduce((sum, leaf) => sum + (leaf.marks ?? 0), 0);
    expect(total).toBe(COMPONENT_TOTAL);
    expect(report.findings.filter((f) => f.code === 'V02')).toEqual([]);
  });

  it('V03: every leaf has a mark scheme', () => {
    expect(report.findings.filter((f) => f.code === 'V03')).toEqual([]);
  });

  it('V07: marks sit on leaves, never on parents', () => {
    expect(report.findings.filter((f) => f.code === 'V07')).toEqual([]);
  });

  it('V08: no question path has a missing ancestor', () => {
    expect(report.findings.filter((f) => f.code === 'V08')).toEqual([]);
  });

  it('V01: every mark scheme adds up', () => {
    expect(report.findings.filter((f) => f.code === 'V01')).toEqual([]);
  });

  it('V15: every leaf is classified against a subtopic', () => {
    expect(report.findings.filter((f) => f.code === 'V15')).toEqual([]);
  });

  it('V21: subtopic weights sum to 1.0', () => {
    expect(report.findings.filter((f) => f.code === 'V21')).toEqual([]);
  });

  it('has a plausible leaf count for a 75-mark Paper 1', () => {
    expect(leaves.length).toBeGreaterThan(20);
    expect(leaves.length).toBeLessThan(60);
  });

  it('reports a flagged rate, and it is a real number', () => {
    const flaggedLeaves = leaves.filter((leaf) => report.flaggedPaths.includes(leaf.path));
    const percentage = (flaggedLeaves.length / leaves.length) * 100;
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });
});

describe('transcript corpus', () => {
  it('carries three complete papers', () => {
    expect(PAPERS).toHaveLength(3);
    for (const { paper } of PAPERS) {
      expect(flatten(paper).length).toBeGreaterThan(20);
    }
  });

  it('V19 spots a repeat when the same stem appears in two years', () => {
    const context = transcriptToValidationContext({
      papers: [P11],
      componentTotalMarks: COMPONENT_TOTAL,
      year: 2023,
    });
    const firstLeaf = context.questions.find((question) => question.marks !== null)!;

    const withHistory = {
      ...context,
      knownStems: [{ displayRef: '9618/11/M/J/21 Q1', stem: firstLeaf.stemMd ?? '', year: 2021 }],
    };
    const report = validateExtraction(withHistory);
    expect(report.findings.some((finding) => finding.code === 'V19')).toBe(true);
  });
});
