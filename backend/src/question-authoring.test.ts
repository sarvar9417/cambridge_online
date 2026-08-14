import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from './lib/actor.js';
import { LatexError } from './lib/latex.js';
import { PgQuestionsRepository } from './repositories/questions-repository.js';
import {
  QuestionAuthoringService,
  questionInputSchema,
} from './services/question-authoring-service.js';

const owner: Actor = {
  id: 'owner-1',
  role: 'owner',
  schoolId: 'school-1',
  fullName: 'Sarvar',
  status: 'active',
};
const student: Actor = { ...owner, id: 'student-1', role: 'student' };

const baseInput = {
  sourcePaperId: '11111111-1111-4111-8111-111111111111',
  componentId: '22222222-2222-4222-8222-222222222222',
  label: 'b',
  path: '3.b',
  displayRef: '9618/12/M/J/23 Q3(b)',
  stemLatex: 'Explain why a primary key is required in a relational database.',
  bodyFormat: 'latex' as const,
  commandWord: 'Explain' as const,
  marks: 3,
  ao: 'AO1' as const,
  answerKind: 'text' as const,
  subtopicIds: ['33333333-3333-4333-8333-333333333333'],
  assets: [],
  markScheme: {
    schemeType: 'any_n_from_m' as const,
    maxMarks: 3,
    groups: [{ label: 'Any three from:', nRequired: 3, marksPerPoint: 1, maxMarks: 3 }],
    points: [1, 2, 3, 4].map((n) => ({
      code: `MP${n}`,
      text: `Mark point ${n}`,
      marks: 1,
      accept: [],
      reject: [],
      requires: [],
      isBod: false,
      groupLabel: 'Any three from:',
    })),
  },
};

const parse = (overrides: Record<string, unknown> = {}) =>
  questionInputSchema.parse({ ...baseInput, ...overrides });

function poolWithClient() {
  const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: 'question-1' }] });
  const release = vi.fn();
  return {
    pool: { connect: vi.fn().mockResolvedValue({ query, release }) } as unknown as Pool,
    query,
    release,
  };
}

describe('question authoring input', () => {
  it('defaults to LaTeX authoring', () => {
    const parsed = questionInputSchema.parse({ ...baseInput, bodyFormat: undefined });
    expect(parsed.bodyFormat).toBe('latex');
  });

  it('requires at least one subtopic so every question is filterable', () => {
    expect(() => parse({ subtopicIds: [] })).toThrow();
  });

  it('rejects a malformed mark point code', () => {
    expect(() =>
      parse({
        markScheme: { ...baseInput.markScheme, points: [{ code: 'first', text: 'x', marks: 1 }] },
      }),
    ).toThrow();
  });

  it('rejects a path that is not dotted', () => {
    expect(() => parse({ path: '3 b' })).toThrow();
  });
});

describe('QuestionAuthoringService.create', () => {
  it('writes question, subtopics, groups and points in one transaction', async () => {
    const { pool, query, release } = poolWithClient();
    const result = await new QuestionAuthoringService(pool).create(owner, parse());

    expect(result).toEqual({ id: 'question-1', status: 'needs_review' });
    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements[0]).toBe('begin');
    expect(statements.some((sql) => sql.includes('insert into questions'))).toBe(true);
    expect(statements.some((sql) => sql.includes('insert into question_subtopics'))).toBe(true);
    expect(statements.some((sql) => sql.includes('insert into mark_schemes'))).toBe(true);
    expect(statements.some((sql) => sql.includes('insert into mark_scheme_groups'))).toBe(true);
    expect(statements.some((sql) => sql.includes('insert into mark_scheme_points'))).toBe(true);
    expect(statements.at(-1)).toBe('commit');
    expect(release).toHaveBeenCalled();
  });

  it('marks the first subtopic primary when none is named', async () => {
    const { pool, query } = poolWithClient();
    await new QuestionAuthoringService(pool).create(owner, parse());
    const call = query.mock.calls.find(([sql]) =>
      String(sql).includes('insert into question_subtopics'),
    )!;
    expect(call[1][2]).toBe(true);
  });

  it('refuses anyone but the owner', async () => {
    const { pool } = poolWithClient();
    await expect(
      new QuestionAuthoringService(pool).create({ ...owner, role: 'teacher' }, parse()),
    ).rejects.toMatchObject({ code: 'owner_only', status: 403 });
  });

  it('rejects LaTeX that KaTeX cannot render before touching the database', async () => {
    const { pool, query } = poolWithClient();
    await expect(
      new QuestionAuthoringService(pool).create(
        owner,
        parse({ stemLatex: '\\input{/etc/passwd}' }),
      ),
    ).rejects.toBeInstanceOf(LatexError);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a diagram asset with no rendered SVG', async () => {
    const { pool } = poolWithClient();
    await expect(
      new QuestionAuthoringService(pool).create(
        owner,
        parse({ assets: [{ kind: 'diagram', altText: 'Logic circuit' }] }),
      ),
    ).rejects.toMatchObject({ code: 'diagram_asset_requires_svg' });
  });

  it('rejects an SVG carrying script', async () => {
    const { pool } = poolWithClient();
    await expect(
      new QuestionAuthoringService(pool).create(
        owner,
        parse({
          assets: [
            { kind: 'diagram', altText: 'x', svgMarkup: '<svg><script>alert(1)</script></svg>' },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(LatexError);
  });

  it('enforces V01 for an all_required scheme', async () => {
    const { pool } = poolWithClient();
    await expect(
      new QuestionAuthoringService(pool).create(
        owner,
        parse({
          markScheme: {
            schemeType: 'all_required',
            maxMarks: 3,
            groups: [],
            points: [
              { code: 'MP1', text: 'a', marks: 1 },
              { code: 'MP2', text: 'b', marks: 1 },
            ],
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'mark_point_total_mismatch' });
  });

  it('enforces V05: "any 3 from 5" needs more options than it awards', async () => {
    const { pool } = poolWithClient();
    await expect(
      new QuestionAuthoringService(pool).create(
        owner,
        parse({
          markScheme: {
            ...baseInput.markScheme,
            points: baseInput.markScheme.points.slice(0, 3),
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'group_needs_more_points' });
  });

  it('rejects a requires pointing at a mark point that does not exist', async () => {
    const { pool } = poolWithClient();
    await expect(
      new QuestionAuthoringService(pool).create(
        owner,
        parse({
          markScheme: {
            ...baseInput.markScheme,
            points: baseInput.markScheme.points.map((point, index) =>
              index === 0 ? { ...point, requires: ['MP9'] } : point,
            ),
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'requires_unknown_mark_point' });
  });

  it('rejects a mark scheme whose maximum disagrees with the question marks', async () => {
    const { pool } = poolWithClient();
    await expect(
      new QuestionAuthoringService(pool).create(
        owner,
        parse({ marks: 5, markScheme: { ...baseInput.markScheme, maxMarks: 3 } }),
      ),
    ).rejects.toMatchObject({ code: 'mark_scheme_marks_mismatch' });
  });

  it('rolls back and reports a duplicate path as 409', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockRejectedValueOnce(Object.assign(new Error(), { code: '23505' }))
      .mockResolvedValue({ rowCount: 1, rows: [{}] });
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
    } as unknown as Pool;

    await expect(new QuestionAuthoringService(pool).create(owner, parse())).rejects.toMatchObject({
      code: 'question_path_taken',
      status: 409,
    });
    expect(query.mock.calls.map(([sql]) => String(sql))).toContain('rollback');
  });
});

describe('PgQuestionsRepository', () => {
  const repositoryWith = (rows: any[]) => {
    const query = vi.fn().mockResolvedValue({ rowCount: rows.length, rows });
    return { repository: new PgQuestionsRepository({ query } as unknown as Pool), query };
  };

  const row = (id: string, sortOrder: number) => ({
    id,
    display_ref: `Q${sortOrder}`,
    stem_md: null,
    stem_latex: 'x',
    context_md: null,
    context_latex: null,
    body_format: 'latex',
    command_word: 'Explain',
    marks: 3,
    ao: 'AO1',
    answer_kind: 'text',
    status: 'approved',
    sort_order: sortOrder,
    subtopics: [],
    assets: [],
    parent: null,
  });

  it('looks a question up by id instead of scanning a page', async () => {
    const { repository, query } = repositoryWith([row('question-51', 51)]);
    const found = await repository.findOne(owner, '44444444-4444-4444-8444-444444444444');

    expect(found?.id).toBe('question-51');
    const [sql, values] = query.mock.calls[0]!;
    // The id is a WHERE predicate, not a post-filter over a limited page.
    expect(String(sql)).toContain('q.id = $1::uuid');
    expect(String(sql)).toContain('limit 1');
    expect(values).toEqual(['44444444-4444-4444-8444-444444444444']);
  });

  it('returns a keyset cursor only when another page exists', async () => {
    const { repository } = repositoryWith([row('a', 1), row('b', 2)]);
    const page = await repository.findVisible(owner, { limit: 1 });

    expect(page.data).toHaveLength(1);
    expect(page.nextCursor).toBeTypeOf('string');
    expect(Buffer.from(page.nextCursor!, 'base64url').toString()).toBe('1|a');
  });

  it('has no next cursor on the last page', async () => {
    const { repository } = repositoryWith([row('a', 1)]);
    expect((await repository.findVisible(owner, { limit: 5 })).nextCursor).toBeNull();
  });

  it('continues from a cursor with a keyset predicate', async () => {
    const { repository, query } = repositoryWith([]);
    await repository.findVisible(owner, {
      cursor: Buffer.from('7|question-7').toString('base64url'),
    });
    expect(String(query.mock.calls[0]![0])).toContain('(q.sort_order, q.id) >');
  });

  it('scopes students to published assignments of their own classes', async () => {
    const { repository, query } = repositoryWith([]);
    await repository.findVisible(student, {});
    const sql = String(query.mock.calls[0]![0]);
    expect(sql).toContain('assignment_questions');
    expect(sql).toContain('a.published_at is not null');
    expect(sql).toContain("q.status = 'approved'");
  });

  it('never lets a student pick a non-approved status filter', async () => {
    const { repository, query } = repositoryWith([]);
    await repository.findVisible(student, { status: 'draft' });
    const sql = String(query.mock.calls[0]![0]);
    expect(sql).toContain("q.status = 'approved'");
    expect(sql).not.toContain('::review_status');
  });

  it('gates a student mark scheme on their own released submission', async () => {
    // Section 12.4: staff read mark schemes freely, a student only after their
    // own grade has been released. The gate is a SQL predicate, not a serializer
    // step a caller could forget.
    const { repository, query } = repositoryWith([]);
    expect(await repository.findMarkScheme(student, 'question-1')).toBeNull();

    const [sql, values] = query.mock.calls[0]!;
    expect(String(sql)).toContain('sub.released_at is not null');
    expect(String(sql)).toContain('sub.student_id = $3');
    expect(values).toEqual(['question-1', 'student', 'student-1']);
  });
});
