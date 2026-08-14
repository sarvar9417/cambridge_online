import { describe, expect, it, vi } from 'vitest';
import { getTableName, is, Table } from 'drizzle-orm';
import type { Database } from '@campath/db';
import { buildDisplayRef, persistPaper, type PersistInput } from './persist.js';
import type { ExtractedQuestion, ExtractedScheme } from './types.js';

/**
 * Recording fake for the Drizzle handle.
 *
 * A real PostgreSQL would be better and is what `apps/api` uses via
 * Testcontainers; that needs Docker, which is not available here. What this
 * still proves is the part that is easy to get wrong and invisible at runtime:
 * that everything happens inside one transaction, that parents are inserted
 * before children so `parent_id` resolves, and that a re-run clears the
 * dependent rows before rewriting them.
 */
function recordingDb() {
  const calls: Array<{ op: string; table: string; values?: unknown }> = [];
  let transactionDepth = 0;
  let maxDepth = 0;

  // Drizzle's own accessor rather than reaching into internals, so the fake
  // keeps working when those internals change.
  const table = (marker: unknown) => (is(marker, Table) ? getTableName(marker) : 'unknown');

  const tx = {
    insert(target: unknown) {
      const name = table(target);
      const chain = {
        values(values: unknown) {
          calls.push({ op: 'insert', table: name, values });
          return chain;
        },
        onConflictDoUpdate() {
          calls.push({ op: 'upsert', table: name });
          return chain;
        },
        returning: async () => [{ id: `${name}-${calls.length}` }],
        then: (resolve: (value: unknown) => unknown) => resolve(undefined),
      };
      return chain;
    },
    delete(target: unknown) {
      const name = table(target);
      return {
        where: async () => {
          calls.push({ op: 'delete', table: name });
        },
      };
    },
    select() {
      return {
        from: () => ({
          where: () => ({ limit: async () => [{ id: 'subtopic-1' }] }),
        }),
      };
    },
  };

  const db = {
    async transaction<T>(run: (tx: unknown) => Promise<T>): Promise<T> {
      transactionDepth += 1;
      maxDepth = Math.max(maxDepth, transactionDepth);
      try {
        return await run(tx);
      } finally {
        transactionDepth -= 1;
      }
    },
  } as unknown as Database;

  return { db, calls, wasTransactional: () => maxDepth === 1 };
}

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

const scheme = (path: string): ExtractedScheme => ({
  path,
  questionRef: path,
  schemeType: 'all_required',
  maxMarks: 3,
  guidanceMd: null,
  groups: [],
  points: [
    {
      code: 'MP1',
      groupLabel: null,
      marks: 3,
      text: 'x',
      accept: [],
      reject: [],
      requires: [],
      isBod: false,
    },
  ],
  levels: [],
  confidence: 0.95,
  issues: [],
});

const input = (over: Partial<PersistInput> = {}): PersistInput => ({
  sourcePaperId: 'paper-1',
  componentId: 'component-1',
  questions: [question({ path: '3', marks: null }), question({ path: '3.a' })],
  schemes: [scheme('3.a')],
  classifications: [
    {
      path: '3.a',
      subtopics: [{ code: '8.1', isPrimary: true, confidence: 0.9, weight: 1 }],
      learningObjectives: [],
      ao: 'AO1',
      aoConfidence: 0.8,
    },
  ],
  dependencies: [],
  verdicts: [],
  findings: [],
  flaggedPaths: [],
  promptVersions: {},
  ...over,
});

describe('persistPaper', () => {
  it('writes everything inside a single transaction', async () => {
    const { db, wasTransactional } = recordingDb();
    await persistPaper(db, input());
    expect(wasTransactional()).toBe(true);
  });

  it('inserts parents before children so parent_id resolves', async () => {
    const { db, calls } = recordingDb();
    await persistPaper(
      db,
      input({
        questions: [
          // Deliberately supplied deepest-first.
          question({ path: '3.c.i' }),
          question({ path: '3.c', marks: null }),
          question({ path: '3', marks: null }),
        ],
        schemes: [scheme('3.c.i')],
        classifications: [],
      }),
    );

    const paths = calls
      .filter((call) => call.op === 'insert' && call.table === 'questions')
      .map((call) => (call.values as { path: string }).path);
    expect(paths).toEqual(['3', '3.c', '3.c.i']);
  });

  it('clears dependent rows before rewriting them, so a re-run drops nothing stale', async () => {
    const { db, calls } = recordingDb();
    await persistPaper(db, input());

    const order = calls.map((call) => `${call.op}:${call.table}`);
    const firstDelete = order.findIndex((entry) => entry.startsWith('delete:'));
    const subtopicInsert = order.indexOf('insert:question_subtopics');
    const schemeInsert = order.indexOf('insert:mark_schemes');

    expect(firstDelete).toBeGreaterThan(-1);
    expect(subtopicInsert).toBeGreaterThan(firstDelete);
    expect(schemeInsert).toBeGreaterThan(firstDelete);
  });

  it('upserts questions so a retry after a partial failure does not duplicate', async () => {
    const { db, calls } = recordingDb();
    await persistPaper(db, input());
    expect(calls.some((call) => call.op === 'upsert' && call.table === 'questions')).toBe(true);
  });

  it('marks a flagged question needs_review and a clean one approved', async () => {
    const { db, calls } = recordingDb();
    await persistPaper(db, input({ flaggedPaths: ['3.a'] }));

    const statuses = calls
      .filter((call) => call.op === 'insert' && call.table === 'questions')
      .map((call) => call.values as { path: string; status: string });

    expect(statuses.find((row) => row.path === '3.a')?.status).toBe('needs_review');
    expect(statuses.find((row) => row.path === '3')?.status).toBe('approved');
  });

  it('writes every finding, so nothing is silently accepted', async () => {
    const { db, calls } = recordingDb();
    await persistPaper(
      db,
      input({
        findings: [
          { code: 'V02', severity: 'error', message: 'totals differ' },
          { code: 'V13', severity: 'warning', message: 'odd marks', path: '3.a' },
        ],
      }),
    );

    const findings = calls.filter(
      (call) => call.op === 'insert' && call.table === 'validation_findings',
    );
    expect(findings).toHaveLength(2);

    // A paper-level finding hangs off the source paper, not off a question.
    const paperLevel = findings.find(
      (call) => (call.values as { ruleCode: string }).ruleCode === 'V02',
    );
    expect((paperLevel!.values as { refTable: string }).refTable).toBe('source_papers');
  });

  it('never writes a dependency of kind none', async () => {
    const { db, calls } = recordingDb();
    await persistPaper(
      db,
      input({
        questions: [
          question({ path: '3', marks: null }),
          question({ path: '3.a' }),
          question({ path: '3.b' }),
        ],
        dependencies: [
          {
            fromPath: '3.b',
            toPath: '3.a',
            kind: 'none',
            strength: 'context_only',
            evidence: null,
            confidence: 0.4,
            note: null,
          },
          {
            fromPath: '3.b',
            toPath: '3.a',
            kind: 'text_ref',
            strength: 'required',
            evidence: 'the table in part (a)',
            confidence: 0.95,
            note: null,
          },
        ],
      }),
    );

    const written = calls.filter(
      (call) => call.op === 'insert' && call.table === 'question_dependencies',
    );
    expect(written).toHaveLength(1);
    expect((written[0]!.values as { kind: string }).kind).toBe('text_ref');
  });

  it('reports leaf counts rather than node counts', async () => {
    const { db } = recordingDb();
    const result = await persistPaper(
      db,
      input({
        questions: [
          question({ path: '3', marks: null }),
          question({ path: '3.a' }),
          question({ path: '3.b' }),
        ],
        schemes: [scheme('3.a'), scheme('3.b')],
        flaggedPaths: ['3.b'],
      }),
    );

    expect(result.questionCount).toBe(3);
    expect(result.leafCount).toBe(2);
    expect(result.approvedCount).toBe(1);
    expect(result.needsReviewCount).toBe(1);
  });

  it('propagates a failure so the transaction rolls back', async () => {
    const db = {
      transaction: vi.fn().mockRejectedValue(new Error('deadlock detected')),
    } as unknown as Database;

    await expect(persistPaper(db, input())).rejects.toThrow('deadlock detected');
  });
});

describe('buildDisplayRef', () => {
  it('renders the Cambridge reference form', () => {
    expect(buildDisplayRef('3')).toBe('Q3');
    expect(buildDisplayRef('3.b')).toBe('Q3(b)');
    expect(buildDisplayRef('3.b.ii')).toBe('Q3(b)(ii)');
  });
});
