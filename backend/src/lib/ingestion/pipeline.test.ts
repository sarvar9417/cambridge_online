import { describe, expect, it, vi } from 'vitest';
import {
  dedupeQuestions,
  matchSchemes,
  needsCrossCheck,
  planBatches,
  runExtractionPipeline,
} from './pipeline.js';
import { IngestionUnavailableError } from './contracts.js';
import type {
  ExtractedMarkScheme,
  ExtractedQuestion,
  ExtractionProvider,
  PreparedPage,
} from './contracts.js';

const usage = { model: 'fake', promptVersion: 'v1' };

const question = (overrides: Partial<ExtractedQuestion> = {}): ExtractedQuestion => ({
  path: '1',
  label: '1',
  parentPath: null,
  stemLatex: 'Explain why a primary key is required in a relational database.',
  commandWord: 'Explain',
  marks: 3,
  answerKind: 'text',
  answerLines: 6,
  sourcePages: [1],
  assets: [],
  issues: [],
  confidence: 0.97,
  ...overrides,
});

const scheme = (overrides: Partial<ExtractedMarkScheme> = {}): ExtractedMarkScheme => ({
  path: '1',
  questionRef: 'Q1',
  schemeType: 'all_required',
  maxMarks: 3,
  guidanceMd: null,
  groups: [],
  points: [1, 2, 3].map((n) => ({
    code: `MP${n}`,
    groupLabel: null,
    marks: 1,
    text: `Point ${n}`,
    accept: [],
    reject: [],
    requires: [],
    isBod: false,
  })),
  levels: [],
  confidence: 0.95,
  issues: [],
  ...overrides,
});

const pages = (count: number): PreparedPage[] =>
  Array.from({ length: count }, (_, index) => ({
    page: index + 1,
    imagePath: `page-${index + 1}.png`,
    textLayer: `text ${index + 1}`,
  }));

function fakeProvider(overrides: Partial<ExtractionProvider> = {}): ExtractionProvider {
  return {
    available: () => true,
    extractQuestions: vi.fn().mockResolvedValue({
      batch: { questions: [question()], truncated: false, pageTotalMarks: 3 },
      usage,
    }),
    extractMarkScheme: vi.fn().mockResolvedValue({ schemes: [scheme()], usage }),
    classify: vi.fn().mockResolvedValue({
      classification: {
        path: '1',
        subtopics: [{ code: '8.1', isPrimary: true, confidence: 0.93 }],
        learningObjectives: [],
        ao: 'AO2',
        aoConfidence: 0.8,
      },
      usage,
    }),
    crossCheck: vi
      .fn()
      .mockResolvedValue({ verdict: { agrees: true, disagreements: [], confidence: 0.95 }, usage }),
    ...overrides,
  };
}

const baseInput = {
  questionPages: pages(1),
  markSchemePages: pages(1),
  metadata: { year: 2023 },
  componentTotal: 3,
  componentName: 'Theory Fundamentals',
  level: 'AS',
  subtopics: [{ code: '8.1', title: 'Database Concepts' }],
  sampler: () => 0.5,
};

describe('planBatches', () => {
  it('overlaps batches by one page so split questions are seen whole', () => {
    expect(planBatches(7)).toEqual([
      [1, 2, 3],
      [3, 4, 5],
      [5, 6, 7],
    ]);
  });

  it('handles a paper shorter than one batch', () => {
    expect(planBatches(2)).toEqual([[1, 2]]);
  });

  it('returns nothing for an empty paper', () => {
    expect(planBatches(0)).toEqual([]);
  });

  it('never emits a batch past the last page', () => {
    for (const total of [1, 4, 5, 6, 9]) {
      for (const batch of planBatches(total)) {
        expect(Math.max(...batch)).toBeLessThanOrEqual(total);
      }
    }
  });
});

describe('dedupeQuestions', () => {
  it('keeps the more confident reading of an overlapped question', () => {
    const result = dedupeQuestions([
      question({ path: '3', confidence: 0.6, marks: 2 }),
      question({ path: '3', confidence: 0.95, marks: 3 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.marks).toBe(3);
  });

  it('sorts numerically, not lexically', () => {
    const result = dedupeQuestions([question({ path: '10' }), question({ path: '2' })]);
    expect(result.map((entry) => entry.path)).toEqual(['2', '10']);
  });
});

describe('matchSchemes', () => {
  it('pairs by path and reports orphans on both sides', () => {
    const result = matchSchemes(
      [question({ path: '1' }), question({ path: '2' })],
      [scheme({ path: '1' }), scheme({ path: '9' })],
    );
    expect(result.pairs.map((pair) => pair.question.path)).toEqual(['1']);
    expect(result.unmatchedQuestions).toEqual(['2']);
    expect(result.unmatchedSchemes).toEqual(['9']);
  });

  it('does not expect a mark scheme for a parent question', () => {
    const result = matchSchemes(
      [question({ path: '3', marks: null }), question({ path: '3.a', parentPath: '3' })],
      [scheme({ path: '3.a' })],
    );
    expect(result.unmatchedQuestions).toEqual([]);
  });
});

describe('needsCrossCheck', () => {
  it('always checks a low-confidence extraction', () => {
    expect(needsCrossCheck(question({ confidence: 0.8 }), scheme(), 0.9)).toBe(true);
  });

  it('always checks a question carrying a diagram', () => {
    const withDiagram = question({ assets: [{ kind: 'diagram', altText: 'Logic circuit' }] });
    expect(needsCrossCheck(withDiagram, scheme(), 0.9)).toBe(true);
  });

  it('always checks a scheme type other than all_required', () => {
    expect(
      needsCrossCheck(question({ confidence: 1 }), scheme({ schemeType: 'any_n_from_m' }), 0.9),
    ).toBe(true);
  });

  it('samples a tenth of otherwise clean questions', () => {
    const clean = question({ confidence: 1 });
    expect(needsCrossCheck(clean, scheme(), 0.05)).toBe(true);
    expect(needsCrossCheck(clean, scheme(), 0.5)).toBe(false);
  });
});

describe('runExtractionPipeline', () => {
  it('approves a clean paper', async () => {
    const result = await runExtractionPipeline(fakeProvider(), baseInput);
    expect(result.findings).toEqual([]);
    expect(result.status).toBe('approved');
    expect(result.questions).toHaveLength(1);
    expect(result.classifications).toHaveLength(1);
  });

  it('refuses to run without a model', async () => {
    await expect(
      runExtractionPipeline(fakeProvider({ available: () => false }), baseInput),
    ).rejects.toBeInstanceOf(IngestionUnavailableError);
  });

  it('flags a paper whose marks do not add up to the component total', async () => {
    const result = await runExtractionPipeline(fakeProvider(), {
      ...baseInput,
      componentTotal: 75,
    });
    expect(result.findings.some((finding) => finding.code === 'V02')).toBe(true);
    expect(result.status).toBe('needs_review');
  });

  it('flags a mark scheme with no question', async () => {
    const provider = fakeProvider({
      extractMarkScheme: vi.fn().mockResolvedValue({ schemes: [scheme({ path: '9' })], usage }),
    });
    const result = await runExtractionPipeline(provider, baseInput);
    expect(result.findings.some((finding) => finding.code === 'V04')).toBe(true);
    expect(result.findings.some((finding) => finding.code === 'V03')).toBe(true);
  });

  it('flags LaTeX the renderer would choke on', async () => {
    const provider = fakeProvider({
      extractQuestions: vi.fn().mockResolvedValue({
        batch: {
          questions: [question({ stemLatex: 'Draw \\begin{tikzpicture}\\end{tikzpicture}' })],
          truncated: false,
          pageTotalMarks: 3,
        },
        usage,
      }),
    });
    const result = await runExtractionPipeline(provider, baseInput);
    expect(result.findings.some((finding) => finding.code === 'V21')).toBe(true);
    expect(result.status).toBe('needs_review');
  });

  it('records a cross-check disagreement as an error and never auto-fixes it', async () => {
    const provider = fakeProvider({
      crossCheck: vi.fn().mockResolvedValue({
        verdict: {
          agrees: false,
          disagreements: [
            { field: 'marks', extracted: 3, observed: 4, confidence: 0.9, note: 'reads [4]' },
          ],
          confidence: 0.9,
        },
        usage,
      }),
    });
    const result = await runExtractionPipeline(provider, { ...baseInput, sampler: () => 0.01 });

    expect(result.crossChecks).toHaveLength(1);
    expect(result.findings.some((finding) => finding.code === 'V22')).toBe(true);
    // The extraction is reported, not corrected: a second model's "fix" would
    // replace one silent error with another.
    expect(result.questions[0]!.marks).toBe(3);
  });

  it('feeds prior refs forward so batches do not restate the same question', async () => {
    const extractQuestions = vi
      .fn()
      .mockResolvedValueOnce({
        batch: { questions: [question({ path: '1' })], truncated: false, pageTotalMarks: 3 },
        usage,
      })
      .mockResolvedValue({
        batch: { questions: [question({ path: '2' })], truncated: false, pageTotalMarks: 3 },
        usage,
      });

    await runExtractionPipeline(fakeProvider({ extractQuestions }), {
      ...baseInput,
      questionPages: pages(5),
      componentTotal: 6,
    });

    expect(extractQuestions.mock.calls[1]![0].priorRefs).toEqual(['1']);
  });

  it('does not classify parent questions that carry no marks', async () => {
    const classify = vi.fn().mockResolvedValue({
      classification: {
        path: '3.a',
        subtopics: [{ code: '8.1', isPrimary: true, confidence: 0.9 }],
        learningObjectives: [],
        ao: 'AO1',
        aoConfidence: 0.8,
      },
      usage,
    });
    const provider = fakeProvider({
      classify,
      extractQuestions: vi.fn().mockResolvedValue({
        batch: {
          questions: [
            question({ path: '3', marks: null }),
            question({ path: '3.a', parentPath: '3', marks: 3 }),
          ],
          truncated: false,
          pageTotalMarks: 3,
        },
        usage,
      }),
      extractMarkScheme: vi.fn().mockResolvedValue({ schemes: [scheme({ path: '3.a' })], usage }),
    });

    await runExtractionPipeline(provider, baseInput);
    expect(classify).toHaveBeenCalledTimes(1);
    expect(classify.mock.calls[0]![0].question.path).toBe('3.a');
  });
});
