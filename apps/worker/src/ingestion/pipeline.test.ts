import { describe, expect, it } from 'vitest';
import {
  CROSSCHECK_SAMPLE_RATE,
  checkPageTotals,
  dedupeQuestions,
  dependencyCandidates,
  matchSchemes,
  needsCrossCheck,
  selectForCrossCheck,
  worthClassifying,
} from './pipeline.js';
import { flaggedRate } from '@campath/shared';
import { buildIngestFlow, stageJobId } from './flow.js';
import { planBatches } from './prepare.js';
import { buildDisplayRef } from './persist.js';
import { STAGES } from './types.js';
import type { ExtractedQuestion, ExtractedScheme } from './types.js';

const question = (over: Partial<ExtractedQuestion> & { path: string }): ExtractedQuestion => ({
  label: over.path.split('.').at(-1)!,
  parentPath: over.path.includes('.') ? over.path.slice(0, over.path.lastIndexOf('.')) : null,
  stemMd: 'Explain why a primary key is required.',
  contextMd: null,
  commandWord: 'Explain',
  marks: 3,
  answerKind: 'text',
  answerLines: 6,
  sourcePages: [4],
  assets: [],
  issues: [],
  confidence: 0.96,
  ...over,
});

const scheme = (over: Partial<ExtractedScheme> & { path: string }): ExtractedScheme => ({
  questionRef: over.path,
  schemeType: 'all_required',
  maxMarks: 3,
  guidanceMd: null,
  groups: [],
  points: [],
  levels: [],
  confidence: 0.95,
  issues: [],
  ...over,
});

describe('planBatches', () => {
  it('overlaps by one page so a split question is seen whole', () => {
    expect(planBatches(7)).toEqual([
      [1, 2, 3],
      [3, 4, 5],
      [5, 6, 7],
    ]);
  });

  it('handles a paper shorter than one batch', () => {
    expect(planBatches(2)).toEqual([[1, 2]]);
  });

  it('never runs past the last page', () => {
    for (const total of [1, 4, 5, 6, 9, 12]) {
      for (const batch of planBatches(total)) expect(Math.max(...batch)).toBeLessThanOrEqual(total);
    }
  });

  it('covers every page at least once', () => {
    const seen = new Set(planBatches(9).flat());
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('dedupeQuestions', () => {
  it('keeps the more confident reading of an overlapped question', () => {
    const result = dedupeQuestions([
      question({ path: '3.b', confidence: 0.6, marks: 2 }),
      question({ path: '3.b', confidence: 0.95, marks: 3 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.marks).toBe(3);
  });

  it('always prefers a complete reading over a truncated one', () => {
    const result = dedupeQuestions([
      question({ path: '3.b', confidence: 0.99, issues: ['truncated'], marks: 2 }),
      question({ path: '3.b', confidence: 0.7, issues: [], marks: 3 }),
    ]);
    expect(result[0]!.marks).toBe(3);
  });

  it('sorts numerically so Q10 follows Q9', () => {
    const result = dedupeQuestions([question({ path: '10' }), question({ path: '9' })]);
    expect(result.map((item) => item.path)).toEqual(['9', '10']);
  });
});

describe('checkPageTotals', () => {
  it('says nothing when the model sum matches what it assigned', () => {
    expect(
      checkPageTotals([
        { questions: [question({ path: '1', marks: 3 })], truncated: false, pageTotalMarks: 3 },
      ]),
    ).toEqual([]);
  });

  it('reports a batch where a question was dropped', () => {
    const [mismatch] = checkPageTotals([
      { questions: [question({ path: '1', marks: 3 })], truncated: false, pageTotalMarks: 12 },
    ]);
    expect(mismatch).toMatchObject({ reported: 12, assigned: 3 });
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

  it('does not expect a mark scheme for a parent', () => {
    const result = matchSchemes(
      [question({ path: '3', marks: null }), question({ path: '3.a' })],
      [scheme({ path: '3.a' })],
    );
    expect(result.unmatchedQuestions).toEqual([]);
  });
});

describe('dependencyCandidates', () => {
  it('resolves "part (a)" to the sibling path', () => {
    const candidates = dependencyCandidates([
      question({ path: '3.a', stemMd: 'Complete the table.' }),
      question({ path: '3.c', stemMd: 'Using your answer to part (a), calculate the size.' }),
    ]);
    const resolved = worthClassifying(candidates);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ fromPath: '3.c', toPath: '3.a' });
  });

  it('drops a reference to a sibling that does not exist', () => {
    const candidates = dependencyCandidates([
      question({ path: '3.c', stemMd: 'Using your answer to part (h), explain.' }),
    ]);
    expect(worthClassifying(candidates)).toEqual([]);
  });

  it('catches the material patterns as well as the answer ones', () => {
    const candidates = dependencyCandidates([
      question({ path: '4.a', stemMd: 'Draw the circuit.' }),
      question({ path: '4.b', stemMd: 'The diagram in part (a) shows a full adder.' }),
    ]);
    expect(worthClassifying(candidates).length).toBeGreaterThan(0);
  });

  it('does not fire on prose that merely contains the word part', () => {
    const candidates = dependencyCandidates([
      question({ path: '1', stemMd: 'Describe one part of the fetch-execute cycle.' }),
    ]);
    expect(worthClassifying(candidates)).toEqual([]);
  });
});

describe('needsCrossCheck', () => {
  it('always checks a low-confidence extraction', () => {
    expect(
      needsCrossCheck(question({ path: '1', confidence: 0.8 }), scheme({ path: '1' }), 0.9),
    ).toBe(true);
  });

  it('always checks a question carrying a diagram', () => {
    const withDiagram = question({
      path: '1',
      confidence: 1,
      assets: [{ kind: 'diagram', contentMd: null, altText: 'Logic circuit', bbox: null, page: 1 }],
    });
    expect(needsCrossCheck(withDiagram, scheme({ path: '1' }), 0.9)).toBe(true);
  });

  it('always checks anything but all_required', () => {
    expect(
      needsCrossCheck(
        question({ path: '1', confidence: 1 }),
        scheme({ path: '1', schemeType: 'any_n_from_m' }),
        0.9,
      ),
    ).toBe(true);
  });

  it('samples a tenth of otherwise clean questions', () => {
    const clean = question({ path: '1', confidence: 1 });
    expect(needsCrossCheck(clean, scheme({ path: '1' }), 0.05)).toBe(true);
    expect(needsCrossCheck(clean, scheme({ path: '1' }), 0.5)).toBe(false);
  });

  it('selects roughly the intended share of a clean paper', () => {
    const questions = Array.from({ length: 100 }, (_, i) =>
      question({ path: String(i + 1), confidence: 1 }),
    );
    const pairs = questions.map((q) => ({ question: q, scheme: scheme({ path: q.path }) }));
    // Deterministic sampler: every tenth value falls under the rate.
    let call = 0;
    const selected = selectForCrossCheck(pairs, questions, () => (call++ % 10) / 10);
    expect(selected).toHaveLength(100 * CROSSCHECK_SAMPLE_RATE);
  });
});

describe('flaggedRate', () => {
  it('calls a 5-30% band healthy', () => {
    expect(flaggedRate(100, 15).verdict).toBe('healthy');
  });

  it('warns that validation is too soft below 5%', () => {
    expect(flaggedRate(100, 2).verdict).toBe('validation_too_soft');
  });

  it('warns that extraction is bad above 30%', () => {
    expect(flaggedRate(100, 45).verdict).toBe('extraction_poor');
  });

  it('does not divide by zero on an empty paper', () => {
    expect(flaggedRate(0, 0).percentage).toBe(0);
  });
});

describe('flow', () => {
  it('nests all twelve stages with UPLOAD innermost', () => {
    const flow = buildIngestFlow({ sourcePaperId: 'paper-1', sha256: 'a'.repeat(64) });

    const order: string[] = [];
    let node: typeof flow | undefined = flow;
    while (node) {
      order.unshift(node.name);
      node = node.children?.[0];
    }
    expect(order).toEqual([...STAGES]);
  });

  it('derives job ids from the sha256 so a re-upload collapses', () => {
    const sha = 'b'.repeat(64);
    expect(stageJobId(sha, 'PERSIST')).toBe(`ingest:${sha}:PERSIST`);
    // Two builds of the same paper produce identical ids; BullMQ then refuses
    // the duplicate rather than extracting it twice.
    const first = buildIngestFlow({ sourcePaperId: 'row-1', sha256: sha });
    const second = buildIngestFlow({ sourcePaperId: 'row-2', sha256: sha });
    expect(first.opts?.jobId).toBe(second.opts?.jobId);
  });

  it('retries with backoff rather than failing a paper on one blip', () => {
    const flow = buildIngestFlow({ sourcePaperId: 'p', sha256: 'c'.repeat(64) });
    expect(flow.opts?.attempts).toBe(3);
    expect(flow.opts?.backoff).toMatchObject({ type: 'exponential' });
  });
});

describe('buildDisplayRef', () => {
  it('renders the Cambridge reference form', () => {
    expect(buildDisplayRef('3')).toBe('Q3');
    expect(buildDisplayRef('3.b')).toBe('Q3(b)');
    expect(buildDisplayRef('3.b.ii')).toBe('Q3(b)(ii)');
  });
});
