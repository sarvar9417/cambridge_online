import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type pg from 'pg';
import { login, resetRateLimits, SEED_CREDENTIALS, startHarness, type Harness } from './harness.js';

/**
 * BLOCKING-adjacent coverage for the question bank and the part-level
 * extraction workflow (Prompt C): leaves not families as the default view, the
 * context chain travelling with a leaf, dependency surfacing, renumbering, and
 * `context_only` items contributing zero marks.
 *
 * The seed ships no questions, so this suite inserts a small real tree —
 * Q3 with a shared scenario, Q3(a) as a leaf, Q3(b)(i) as a leaf that depends
 * on the Q3(a) answer — through the same tables the ingestion pipeline writes.
 */

let harness: Harness;
let pool: pg.Pool;
let ownerToken: string;
let ids: Record<string, string>;

const insertTree = async () => {
  const syllabus = (
    await pool.query('select id from syllabi where code=$1 and is_active limit 1', ['9618'])
  ).rows[0]!.id;
  const component = (
    await pool.query('select id from components where syllabus_id=$1 and number=1', [syllabus])
  ).rows[0]!.id;
  const sha = `e2e-${randomUUID()}`;
  // A previous aborted run may have left a tree behind; clear it so this run
  // starts from the same empty state every time.
  await pool.query("delete from source_papers where sha256 like 'e2e-%'");
  const paper = await pool.query(
    `insert into source_papers (syllabus_id, component_id, year, series, variant, kind, storage_path, sha256, uploaded_by)
     values ($1, $2, 2023, 'MJ', 1, 'QP', 'e2e/qp.pdf', $3, $4) returning id`,
    [syllabus, component, sha, ownerId()],
  );
  const paperId = paper.rows[0]!.id;

  const q3 = await pool.query(
    `insert into questions (source_paper_id, component_id, label, path, display_ref, depth, sort_order,
       context_md, status)
     values ($1, $2, '3', '3', '9618/11/M/J/23 Q3', 0, 3, 'A company stores customer records in a relational database.', 'approved')
     returning id`,
    [paperId, component],
  );
  const q3Id = q3.rows[0]!.id;

  const q3a = await pool.query(
    `insert into questions (source_paper_id, component_id, parent_id, label, path, display_ref, depth, sort_order,
       stem_md, command_word, marks, ao, answer_kind, status)
     values ($1, $2, $3, 'a', '3.a', '9618/11/M/J/23 Q3(a)', 1, 1,
       'Write an SQL query that returns all customer names.', 'Write', 2, 'AO1', 'text', 'approved')
     returning id`,
    [paperId, component, q3Id],
  );
  const q3aId = q3a.rows[0]!.id;

  const q3b = await pool.query(
    `insert into questions (source_paper_id, component_id, parent_id, label, path, display_ref, depth, sort_order,
       context_md, status)
     values ($1, $2, $3, 'b', '3.b', '9618/11/M/J/23 Q3(b)', 1, 2,
       'The company adds an Orders table.', 'approved')
     returning id`,
    [paperId, component, q3Id],
  );
  const q3bId = q3b.rows[0]!.id;

  const q3bi = await pool.query(
    `insert into questions (source_paper_id, component_id, parent_id, label, path, display_ref, depth, sort_order,
       stem_md, command_word, marks, ao, answer_kind, status)
     values ($1, $2, $3, 'i', '3.b.i', '9618/11/M/J/23 Q3(b)(i)', 2, 1,
       'Explain why the index speeds up the query from part (a).', 'Explain', 3, 'AO2', 'text', 'approved')
     returning id`,
    [paperId, component, q3bId],
  );
  const q3biId = q3bi.rows[0]!.id;

  // Shared scenario asset on the root.
  await pool.query(
    `insert into question_assets (question_id, kind, content_md, alt_text, sort_order)
     values ($1, 'table', '| id | name | city |', 'Customers table', 1)`,
    [q3Id],
  );

  // Subtopic links so subtopic filtering returns leaves.
  const subtopic = (
    await pool.query(
      `select st.id from subtopics st join topics t on t.id=st.topic_id
       where t.syllabus_id=$1 order by t.number, st.sort_order limit 1`,
      [syllabus],
    )
  ).rows[0]!.id;
  for (const questionId of [q3aId, q3biId]) {
    await pool.query(
      `insert into question_subtopics (question_id, subtopic_id, is_primary, weight)
       values ($1, $2, true, 1.0)`,
      [questionId, subtopic],
    );
  }

  // Q3(b)(i) refers to the Q3(a) answer.
  await pool.query(
    `insert into question_dependencies (question_id, depends_on_id, kind, strength, evidence)
     values ($1, $2, 'answer', 'hard', 'the query from part (a)')`,
    [q3biId, q3aId],
  );

  return { q3Id, q3aId, q3bId, q3biId, paperId, subtopic };
};

let ownerIdValue: string;
const ownerId = () => ownerIdValue;

beforeAll(async () => {
  harness = await startHarness();
  pool = harness.pool;
  ownerIdValue = harness.seeded.ownerId;
  ids = await insertTree();
  ownerToken = (
    await login(harness.app, SEED_CREDENTIALS.ownerEmail, SEED_CREDENTIALS.ownerPassword)
  ).accessToken;
}, 180_000);

afterAll(async () => {
  await harness?.stop();
});

beforeEach(() => resetRateLimits());

const server = () => harness.app.getHttpServer();
const auth = () => ({ authorization: `Bearer ${ownerToken}` });

describe('question bank (Prompt C)', () => {
  it('returns leaves, not families, by default when filtering by subtopic', async () => {
    const response = await request(server())
      .get('/api/v1/questions')
      .query({ subtopicIds: [ids.subtopic] })
      .set(auth())
      .expect(200);
    expect(response.body.view).toBe('parts');
    const leaves = response.body.data as Array<Record<string, unknown>>;
    expect(leaves.length).toBeGreaterThanOrEqual(2);
    // Only mark-bearing leaves, not the context-only parents.
    for (const leaf of leaves) {
      expect(leaf.marks).toBeGreaterThan(0);
      expect(leaf.displayRef).not.toContain('Q3 (b)');
    }
  });

  it('families view groups matching parts under the root question', async () => {
    const response = await request(server())
      .get('/api/v1/questions')
      .query({ view: 'families', subtopicIds: [ids.subtopic] })
      .set(auth())
      .expect(200);
    expect(response.body.view).toBe('families');
    const families = response.body.data as Array<{
      rootId: string;
      matchCount: number;
      totalCount: number;
      parts: Array<{ matches: boolean }>;
    }>;
    expect(families.length).toBeGreaterThanOrEqual(1);
    const family = families.find((entry) => entry.rootId === ids.q3Id);
    expect(family).toBeDefined();
    expect(family!.totalCount).toBe(2); // Q3(a), Q3(b)(i)
    expect(family!.matchCount).toBe(2);
  });

  it('portable pulls the full context chain with assets in ancestor order', async () => {
    const response = await request(server())
      .get(`/api/v1/questions/${ids.q3biId}/portable`)
      .set(auth())
      .expect(200);
    const portable = response.body as {
      leaf: { id: string; marks: number };
      chain: Array<{ id: string }>;
      contextBlocks: Array<{ id: string; context: string | null; assets: unknown[] }>;
      sourceRef: string;
    };
    expect(portable.leaf.id).toBe(ids.q3biId);
    expect(portable.chain.map((node) => node.id)).toEqual([ids.q3Id, ids.q3bId, ids.q3biId]);
    expect(portable.contextBlocks.map((block) => block.id)).toEqual([ids.q3Id, ids.q3bId]);
    // Root carries both its scenario and the shared table asset.
    expect(portable.contextBlocks[0]!.context).toContain('customer records');
    expect(portable.contextBlocks[0]!.assets.length).toBe(1);
    expect(portable.sourceRef).toContain('Q3(b)(i)');
  });

  it('dependency filter returns only independent leaves', async () => {
    const response = await request(server())
      .get('/api/v1/questions')
      .query({ dependency: 'independent' })
      .set(auth())
      .expect(200);
    const leaves = response.body.data as Array<{ id: string; hasDependency: boolean }>;
    expect(leaves.some((leaf) => leaf.id === ids.q3biId)).toBe(false);
    expect(leaves.some((leaf) => leaf.id === ids.q3aId)).toBe(true);
  });

  it('students are refused the bank with 403', async () => {
    const student = await login(harness.app, 'student01', SEED_CREDENTIALS.studentPassword);
    await request(server())
      .get('/api/v1/questions')
      .set('authorization', `Bearer ${student.accessToken}`)
      .expect(403);
  });
});

describe('selections (Prompt C)', () => {
  let selectionId: string;

  it('creates a basket', async () => {
    const response = await request(server())
      .post('/api/v1/selections')
      .send({ name: 'SQL amaliyot' })
      .set(auth())
      .expect(201);
    selectionId = response.body.id as string;
    expect(response.body.name).toBe('SQL amaliyot');
  });

  it('adding a leaf with a dependency returns the dependency for the modal', async () => {
    const response = await request(server())
      .post(`/api/v1/selections/${selectionId}/items`)
      .send({ questionId: ids.q3biId, role: 'graded' })
      .set(auth())
      .expect(201);
    const body = response.body as {
      item: { id: string; role: string };
      dependencies: Array<{ dependsOnId: string; kind: string; displayRef: string }>;
      portable: { contextBlocks: unknown[] };
    };
    expect(body.item.role).toBe('graded');
    expect(body.dependencies.length).toBe(1);
    expect(body.dependencies[0]!.dependsOnId).toBe(ids.q3aId);
    expect(body.dependencies[0]!.kind).toBe('answer');
    // The full context chain travels with the item.
    expect(body.portable.contextBlocks.length).toBe(2);
  });

  it('adds the dependent part as context_only and renumbers the basket', async () => {
    await request(server())
      .post(`/api/v1/selections/${selectionId}/items`)
      .send({ questionId: ids.q3aId, role: 'context_only' })
      .set(auth())
      .expect(201);

    const review = await request(server())
      .get(`/api/v1/selections/${selectionId}`)
      .set(auth())
      .expect(200);
    const body = review.body as {
      items: Array<{
        freshRef: string;
        role: string;
        effectiveMarks: number;
        sourceRef: string;
      }>;
      totalMarks: number;
    };
    // Two parts of one family: Q1(b)(i) graded (3 marks), Q1(a) context only (0).
    expect(body.items.map((item) => item.freshRef).sort()).toEqual(['Q1(a)', 'Q1(b)(i)']);
    const graded = body.items.find((item) => item.role === 'graded')!;
    expect(graded.effectiveMarks).toBe(3);
    const context = body.items.find((item) => item.role === 'context_only')!;
    expect(context.effectiveMarks).toBe(0);
    expect(body.totalMarks).toBe(3);
    expect(context.sourceRef).toContain('Q3(a)');
  });

  it('role change recomputes the total', async () => {
    const review = await request(server())
      .get(`/api/v1/selections/${selectionId}`)
      .set(auth())
      .expect(200);
    const graded = (review.body as { items: Array<{ id: string }> }).items.find(
      (_, index) => index === 0,
    )!;

    await request(server())
      .patch(`/api/v1/selections/${selectionId}/items/${graded.id}`)
      .send({ role: 'context_only' })
      .set(auth())
      .expect(200);

    const after = await request(server())
      .get(`/api/v1/selections/${selectionId}`)
      .set(auth())
      .expect(200);
    expect((after.body as { totalMarks: number }).totalMarks).toBe(0);
  });

  it('removing an item shrinks the basket', async () => {
    const review = await request(server())
      .get(`/api/v1/selections/${selectionId}`)
      .set(auth())
      .expect(200);
    const items = (review.body as { items: Array<{ id: string }> }).items;
    expect(items.length).toBe(2);

    await request(server())
      .delete(`/api/v1/selections/${selectionId}/items/${items[0]!.id}`)
      .set(auth())
      .expect(200);

    const after = await request(server())
      .get(`/api/v1/selections/${selectionId}`)
      .set(auth())
      .expect(200);
    expect((after.body as { items: unknown[] }).items.length).toBe(1);
  });

  it('baskets persist across requests (server-side, survives filter changes)', async () => {
    const list = await request(server()).get('/api/v1/selections').set(auth()).expect(200);
    const baskets = list.body as Array<{ id: string; name: string }>;
    expect(baskets.some((basket) => basket.id === selectionId)).toBe(true);
  });
});
