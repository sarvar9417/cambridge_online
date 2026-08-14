import { describe, expect, it } from 'vitest';
import {
  ALL_RULES,
  RULE_COUNT,
  V01,
  V02,
  V03,
  V04,
  V05,
  V06,
  V07,
  V08,
  V09,
  V10,
  V11,
  V12,
  V13,
  V14,
  V15,
  V16,
  V17,
  V18,
  V19,
  V20,
  V21,
  V22,
  V23,
  findDependencyMentions,
  statusForQuestion,
  stemSimilarity,
  validateExtraction,
} from './index.js';
import type {
  ValidationAsset,
  ValidationContext,
  ValidationQuestion,
  ValidationScheme,
} from './types.js';

const question = (over: Partial<ValidationQuestion> & { path: string }): ValidationQuestion => ({
  parentPath: over.path.includes('.') ? over.path.slice(0, over.path.lastIndexOf('.')) : null,
  displayRef: `Q${over.path}`,
  marks: 3,
  stemMd: 'Explain why a primary key is required in a relational database.',
  contextMd: null,
  commandWord: 'Explain',
  answerKind: 'text',
  answerLines: 6,
  extractConfidence: 0.95,
  subtopics: [{ code: '8.1', confidence: 0.9, weight: 1, isPrimary: true }],
  ...over,
});

const scheme = (over: Partial<ValidationScheme> & { questionPath: string }): ValidationScheme => ({
  type: 'all_required',
  maxMarks: 3,
  points: [
    { code: 'MP1', marks: 1, groupLabel: null },
    { code: 'MP2', marks: 1, groupLabel: null },
    { code: 'MP3', marks: 1, groupLabel: null },
  ],
  groups: [],
  levelCount: 0,
  confidence: 0.95,
  ...over,
});

const context = (over: Partial<ValidationContext> = {}): ValidationContext => ({
  componentTotalMarks: 3,
  year: 2023,
  questions: [question({ path: '1' })],
  schemes: [scheme({ questionPath: '1' })],
  assets: [],
  dependencies: [],
  ...over,
});

const codes = (findings: { code: string }[]) => findings.map((f) => f.code);

describe('rule registry', () => {
  it('registers exactly 23 rules', () => {
    expect(RULE_COUNT).toBe(23);
  });

  it('has no duplicate rule code', () => {
    const all = ALL_RULES.map((rule) => rule.code);
    expect(new Set(all).size).toBe(all.length);
  });

  it('covers V01 through V23 with no gap', () => {
    const expected = Array.from({ length: 23 }, (_, i) => `V${String(i + 1).padStart(2, '0')}`);
    expect(ALL_RULES.map((rule) => rule.code)).toEqual(expected);
  });

  it('splits 13 errors and 10 warnings', () => {
    expect(ALL_RULES.filter((r) => r.severity === 'error')).toHaveLength(13);
    expect(ALL_RULES.filter((r) => r.severity === 'warning')).toHaveLength(10);
  });
});

describe('V01 mark point sum', () => {
  it('accepts an all_required scheme that sums exactly', () => {
    expect(V01.run(context())).toEqual([]);
  });

  it('rejects an all_required scheme that does not sum exactly', () => {
    const ctx = context({ schemes: [scheme({ questionPath: '1', maxMarks: 4 })] });
    expect(codes(V01.run(ctx))).toEqual(['V01']);
  });

  it('accepts any_n_from_m with a larger pool than the maximum', () => {
    const ctx = context({
      schemes: [
        scheme({
          questionPath: '1',
          type: 'any_n_from_m',
          maxMarks: 3,
          points: [1, 2, 3, 4, 5].map((n) => ({
            code: `MP${n}`,
            marks: 1,
            groupLabel: 'Any three from:',
          })),
        }),
      ],
    });
    expect(V01.run(ctx)).toEqual([]);
  });

  it('rejects any_n_from_m whose pool cannot reach the maximum', () => {
    const ctx = context({
      schemes: [
        scheme({
          questionPath: '1',
          type: 'any_n_from_m',
          maxMarks: 5,
          points: [{ code: 'MP1', marks: 1, groupLabel: 'g' }],
        }),
      ],
    });
    expect(codes(V01.run(ctx))).toEqual(['V01']);
  });
});

describe('V02 paper total', () => {
  it('passes when leaf marks equal the component total', () => {
    expect(V02.run(context())).toEqual([]);
  });

  it('sums leaves only, never parents', () => {
    const ctx = context({
      componentTotalMarks: 5,
      questions: [
        question({ path: '3', marks: null, commandWord: null }),
        question({ path: '3.a', marks: 2 }),
        question({ path: '3.b', marks: 3 }),
      ],
      schemes: [
        scheme({
          questionPath: '3.a',
          maxMarks: 2,
          points: [{ code: 'MP1', marks: 2, groupLabel: null }],
        }),
        scheme({ questionPath: '3.b' }),
      ],
    });
    expect(V02.run(ctx)).toEqual([]);
  });

  it('fails when a question is missing', () => {
    const ctx = context({ componentTotalMarks: 75 });
    const [found] = V02.run(ctx);
    expect(found?.code).toBe('V02');
    expect(found?.details).toMatchObject({ total: 3, expected: 75 });
  });
});

describe('V03 and V04 question/scheme pairing', () => {
  it('flags a leaf with no mark scheme', () => {
    expect(codes(V03.run(context({ schemes: [] })))).toEqual(['V03']);
  });

  it('does not expect a mark scheme for a parent', () => {
    const ctx = context({
      questions: [question({ path: '3', marks: null }), question({ path: '3.a' })],
      schemes: [scheme({ questionPath: '3.a' })],
    });
    expect(V03.run(ctx)).toEqual([]);
  });

  it('flags a mark scheme whose question does not exist', () => {
    const ctx = context({ schemes: [scheme({ questionPath: '9' })] });
    expect(codes(V04.run(ctx))).toEqual(['V04']);
  });
});

describe('V05 and V06 groups', () => {
  const grouped = (points: number, nRequired: number, groupMax = 3) =>
    context({
      schemes: [
        scheme({
          questionPath: '1',
          type: 'any_n_from_m',
          maxMarks: 3,
          groups: [{ label: 'g', nRequired, marksPerPoint: 1, maxMarks: groupMax }],
          points: Array.from({ length: points }, (_, i) => ({
            code: `MP${i + 1}`,
            marks: 1,
            groupLabel: 'g',
          })),
        }),
      ],
    });

  it('accepts 5 points for any 3', () => {
    expect(V05.run(grouped(5, 3))).toEqual([]);
  });

  it('rejects 3 points for any 3 — that is all_required in disguise', () => {
    expect(codes(V05.run(grouped(3, 3)))).toEqual(['V05']);
  });

  it('rejects a group worth more than the scheme', () => {
    expect(codes(V06.run(grouped(5, 3, 9)))).toEqual(['V06']);
  });
});

describe('V07 tree marks', () => {
  it('accepts marks on a leaf and none on its parent', () => {
    const ctx = context({
      questions: [question({ path: '3', marks: null }), question({ path: '3.a' })],
    });
    expect(V07.run(ctx)).toEqual([]);
  });

  it('rejects a parent carrying marks', () => {
    const ctx = context({
      questions: [question({ path: '3', marks: 4 }), question({ path: '3.a' })],
    });
    expect(V07.run(ctx)[0]?.path).toBe('3');
  });

  it('rejects a leaf with no marks', () => {
    const ctx = context({ questions: [question({ path: '1', marks: null })] });
    expect(codes(V07.run(ctx))).toEqual(['V07']);
  });
});

describe('V08 path continuity', () => {
  it('accepts a complete chain', () => {
    const ctx = context({
      questions: [
        question({ path: '3', marks: null }),
        question({ path: '3.c', marks: null }),
        question({ path: '3.c.i' }),
      ],
    });
    expect(V08.run(ctx)).toEqual([]);
  });

  it('flags a missing intermediate ancestor', () => {
    const ctx = context({
      questions: [question({ path: '3', marks: null }), question({ path: '3.c.i' })],
    });
    const [found] = V08.run(ctx);
    expect(found?.details).toMatchObject({ ancestor: '3.c' });
  });

  it('reports each broken chain once', () => {
    const ctx = context({ questions: [question({ path: '3.c.i' })] });
    expect(V08.run(ctx)).toHaveLength(1);
  });
});

describe('V09 numbering gaps', () => {
  const roots = (numbers: number[]) =>
    context({ questions: numbers.map((n) => question({ path: String(n), parentPath: null })) });

  it('accepts a contiguous run', () => {
    expect(V09.run(roots([1, 2, 3]))).toEqual([]);
  });

  it('flags a gap', () => {
    expect(V09.run(roots([1, 2, 4]))[0]?.details).toMatchObject({ missing: [3] });
  });

  it('says nothing about a single question', () => {
    expect(V09.run(roots([1]))).toEqual([]);
  });
});

describe('V10 and V11 assets', () => {
  const asset = (over: Partial<ValidationAsset> = {}): ValidationAsset => ({
    id: 'a1',
    questionPath: '1',
    kind: 'diagram',
    storagePath: 'assets/a1.png',
    sizeBytes: 40_000,
    altText: 'Logic circuit',
    contentHash: 'hash-1',
    ...over,
  });

  it('flags a diagram question with no asset', () => {
    const ctx = context({ questions: [question({ path: '1', answerKind: 'diagram' })] });
    expect(codes(V10.run(ctx))).toEqual(['V10']);
  });

  it('accepts a diagram question that has one', () => {
    const ctx = context({
      questions: [question({ path: '1', answerKind: 'diagram' })],
      assets: [asset()],
    });
    expect(V10.run(ctx)).toEqual([]);
  });

  it('rejects a crop under the size floor', () => {
    expect(codes(V11.run(context({ assets: [asset({ sizeBytes: 300 })] })))).toEqual(['V11']);
  });

  it('rejects an asset with no storage path', () => {
    expect(codes(V11.run(context({ assets: [asset({ storagePath: null })] })))).toEqual(['V11']);
  });
});

describe('V22 sibling asset duplication', () => {
  it('flags one figure copied onto three siblings', () => {
    const ctx = context({
      assets: ['3.a', '3.b', '3.c'].map((path, index) => ({
        id: `a${index}`,
        questionPath: path,
        kind: 'table',
        storagePath: `assets/a${index}.png`,
        sizeBytes: 30_000,
        altText: 'Customer table',
        contentHash: 'same-table',
      })),
    });
    const [found] = V22.run(ctx);
    expect(found?.code).toBe('V22');
    expect(found?.path).toBe('3');
  });

  it('says nothing when siblings carry different figures', () => {
    const ctx = context({
      assets: ['3.a', '3.b'].map((path, index) => ({
        id: `a${index}`,
        questionPath: path,
        kind: 'table',
        storagePath: `assets/a${index}.png`,
        sizeBytes: 30_000,
        altText: 'x',
        contentHash: `hash-${index}`,
      })),
    });
    expect(V22.run(ctx)).toEqual([]);
  });
});

describe('V15, V16 and V21 classification', () => {
  it('flags a leaf with no subtopic', () => {
    expect(
      codes(V15.run(context({ questions: [question({ path: '1', subtopics: [] })] }))),
    ).toEqual(['V15']);
  });

  it('flags a weak subtopic confidence', () => {
    const ctx = context({
      questions: [
        question({
          path: '1',
          subtopics: [{ code: '8.1', confidence: 0.4, weight: 1, isPrimary: true }],
        }),
      ],
    });
    expect(codes(V16.run(ctx))).toEqual(['V16']);
  });

  it('accepts weights that sum to one across three subtopics', () => {
    const ctx = context({
      questions: [
        question({
          path: '1',
          subtopics: [
            { code: '10.2', confidence: 0.9, weight: 0.5, isPrimary: true },
            { code: '10.4', confidence: 0.8, weight: 0.3, isPrimary: false },
            { code: '9.2', confidence: 0.8, weight: 0.2, isPrimary: false },
          ],
        }),
      ],
    });
    expect(V21.run(ctx)).toEqual([]);
  });

  it('flags weights that would inflate mastery', () => {
    const ctx = context({
      questions: [
        question({
          path: '1',
          subtopics: [
            { code: '10.2', confidence: 0.9, weight: 1, isPrimary: true },
            { code: '10.4', confidence: 0.9, weight: 1, isPrimary: false },
          ],
        }),
      ],
    });
    expect(V21.run(ctx)[0]?.details).toMatchObject({ sum: 2 });
  });
});

describe('V12, V13, V14, V17 and V18 quality', () => {
  it('flags a missing command word', () => {
    expect(
      codes(V12.run(context({ questions: [question({ path: '1', commandWord: null })] }))),
    ).toEqual(['V12']);
  });

  it('accepts Explain worth 3', () => {
    expect(V13.run(context())).toEqual([]);
  });

  it('flags State worth 6', () => {
    const ctx = context({ questions: [question({ path: '1', commandWord: 'State', marks: 6 })] });
    expect(V13.run(ctx)[0]?.details).toMatchObject({ commandWord: 'State', marks: 6 });
  });

  it('flags fewer answer lines than marks', () => {
    const ctx = context({ questions: [question({ path: '1', marks: 4, answerLines: 2 })] });
    expect(codes(V14.run(ctx))).toEqual(['V14']);
  });

  it('ignores answer lines for a diagram answer', () => {
    const ctx = context({
      questions: [question({ path: '1', answerKind: 'diagram', marks: 4, answerLines: 0 })],
    });
    expect(V14.run(ctx)).toEqual([]);
  });

  it('flags an empty stem', () => {
    expect(codes(V17.run(context({ questions: [question({ path: '1', stemMd: 'x' })] })))).toEqual([
      'V17',
    ]);
  });

  it('flags a runaway stem', () => {
    const ctx = context({ questions: [question({ path: '1', stemMd: 'a'.repeat(3001) })] });
    expect(codes(V17.run(ctx))).toEqual(['V17']);
  });

  it('flags low extraction confidence', () => {
    const ctx = context({ questions: [question({ path: '1', extractConfidence: 0.7 })] });
    expect(codes(V18.run(ctx))).toEqual(['V18']);
  });

  it('accepts confidence exactly at the floor', () => {
    const ctx = context({ questions: [question({ path: '1', extractConfidence: 0.8 })] });
    expect(V18.run(ctx)).toEqual([]);
  });
});

describe('V19 repeats across years', () => {
  it('spots the same question printed in another year', () => {
    const stem = 'Explain why a primary key is required in a relational database.';
    const ctx = context({
      questions: [question({ path: '1', stemMd: stem })],
      knownStems: [{ displayRef: '9618/12/M/J/21 Q4(b)', stem, year: 2021 }],
    });
    expect(V19.run(ctx)[0]?.details).toMatchObject({ year: 2021 });
  });

  it('does not match a different question', () => {
    const ctx = context({
      questions: [question({ path: '1', stemMd: 'Describe how a stack frame is used.' })],
      knownStems: [{ displayRef: 'x', stem: 'Explain why a primary key is required.', year: 2021 }],
    });
    expect(V19.run(ctx)).toEqual([]);
  });

  it('does not flag the paper against itself', () => {
    const stem = 'Explain why a primary key is required in a relational database.';
    const ctx = context({
      questions: [question({ path: '1', stemMd: stem })],
      knownStems: [{ displayRef: 'self', stem, year: 2023 }],
    });
    expect(V19.run(ctx)).toEqual([]);
  });

  it('scores identical text as 1 and unrelated text near 0', () => {
    expect(stemSimilarity('a b c d', 'a b c d')).toBe(1);
    expect(stemSimilarity('alpha beta gamma', 'nothing alike here')).toBeLessThan(0.2);
  });
});

describe('V20 levels of response', () => {
  it('flags a banded scheme with no bands', () => {
    const ctx = context({
      schemes: [scheme({ questionPath: '1', type: 'levels_of_response', levelCount: 0 })],
    });
    expect(codes(V20.run(ctx))).toEqual(['V20']);
  });

  it('accepts one with bands', () => {
    const ctx = context({
      schemes: [scheme({ questionPath: '1', type: 'levels_of_response', levelCount: 3 })],
    });
    expect(V20.run(ctx)).toEqual([]);
  });
});

describe('V23 undeclared dependencies', () => {
  it.each([
    ['Using your answer to part (a), calculate the total.', 'a'],
    ['Complete the table in part (b).', null],
    ['The algorithm in part (c) is modified.', null],
  ])('detects a mention in %j', (stem) => {
    expect(findDependencyMentions(stem).length).toBeGreaterThan(0);
  });

  it('flags a mention with no dependency row', () => {
    const ctx = context({
      questions: [question({ path: '3.c', stemMd: 'Using your answer to part (a), explain why.' })],
    });
    expect(codes(V23.run(ctx))).toEqual(['V23']);
  });

  it('says nothing once the dependency is recorded', () => {
    const ctx = context({
      questions: [question({ path: '3.c', stemMd: 'Using your answer to part (a), explain why.' })],
      dependencies: [{ fromPath: '3.c', toPath: '3.a', kind: 'answer_ref', strength: 'required' }],
    });
    expect(V23.run(ctx)).toEqual([]);
  });

  it('treats a kind of none as not recorded', () => {
    const ctx = context({
      questions: [question({ path: '3.c', stemMd: 'Using your answer to part (a), explain why.' })],
      dependencies: [{ fromPath: '3.c', toPath: '3.a', kind: 'none', strength: 'context_only' }],
    });
    expect(codes(V23.run(ctx))).toEqual(['V23']);
  });

  it('ignores prose that merely contains the word part', () => {
    const ctx = context({
      questions: [question({ path: '1', stemMd: 'Describe one part of the fetch-execute cycle.' })],
    });
    expect(V23.run(ctx)).toEqual([]);
  });
});

describe('validateExtraction', () => {
  it('reports a clean paper with no findings', () => {
    const report = validateExtraction(context());
    expect(report.findings).toEqual([]);
    expect(statusForQuestion(report, '1')).toBe('approved');
  });

  it('separates errors from warnings and blocks the right paths', () => {
    const ctx = context({
      componentTotalMarks: 75,
      questions: [question({ path: '1', commandWord: 'State', marks: 6, extractConfidence: 0.5 })],
      schemes: [scheme({ questionPath: '1', maxMarks: 6 })],
    });
    const report = validateExtraction(ctx);

    expect(report.errorCount).toBeGreaterThan(0);
    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.blockedPaths).toContain('1');
    expect(statusForQuestion(report, '1')).toBe('needs_review');
  });

  it('keeps running when one rule throws', () => {
    const ctx = context();
    // A malformed subtopic array is the kind of thing a bad model response
    // produces; the other rules must still report.
    (ctx.questions[0] as unknown as { subtopics: unknown }).subtopics = null;
    const report = validateExtraction(ctx);
    expect(report.findings.some((f) => f.message.includes('threw'))).toBe(true);
  });
});
