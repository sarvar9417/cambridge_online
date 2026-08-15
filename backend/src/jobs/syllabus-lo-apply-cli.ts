import { readFile } from 'node:fs/promises';
import { pool } from '../database/client.js';

/**
 * Adds learning objectives to subtopics that already exist.
 *
 * `syllabus-catalog-import` refuses to touch a syllabus version that already has
 * topics, which is right: it would rewrite a tree that questions are already
 * classified against. The topics and subtopics here are correct and in use — the
 * only gap was the objectives — so this writes just those, matched to existing
 * subtopics by code.
 *
 * Additive and idempotent: an objective that is already present is left alone.
 *
 *   CONFIRM_SYLLABUS_LO_APPLY=YES npx tsx backend/src/jobs/syllabus-lo-apply-cli.ts \
 *     --file=backend/src/database/syllabus/9618-catalog.json --write
 */
const arg = (name: string) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);

const file = arg('file');
const write = process.argv.includes('--write');
if (!file) throw new Error('Usage: --file=<catalog.json> [--write]');
if (!pool) throw new Error('DATABASE_URL is required');

interface Catalog {
  code: string;
  topics: Array<{
    subtopics: Array<{
      code: string;
      learningObjectives: Array<{ code: string; text: string; sortOrder: number }>;
    }>;
  }>;
}

const catalog = JSON.parse(await readFile(file, 'utf8')) as Catalog;
const wanted = catalog.topics.flatMap((topic) => topic.subtopics);

const existing = await pool.query<{ id: string; code: string }>(
  `select st.id, st.code
   from subtopics st
   join topics t on t.id = st.topic_id
   join syllabi s on s.id = t.syllabus_id
   where s.code = $1 and s.is_active`,
  [catalog.code],
);
const idByCode = new Map(existing.rows.map((row) => [row.code, row.id]));

const unmatched = wanted.filter((subtopic) => !idByCode.has(subtopic.code)).map((s) => s.code);
const objectiveCount = wanted.reduce((sum, s) => sum + s.learningObjectives.length, 0);

console.log(`subtopics in catalog : ${wanted.length}`);
console.log(`matched in database  : ${wanted.length - unmatched.length}`);
console.log(`objectives to write  : ${objectiveCount}`);
if (unmatched.length) console.log(`unmatched codes      : ${unmatched.join(', ')}`);

if (!write) {
  console.log('\nDry run. Pass --write to apply.');
  await pool.end();
  process.exit(0);
}
if (process.env.CONFIRM_SYLLABUS_LO_APPLY !== 'YES') {
  throw new Error('Set CONFIRM_SYLLABUS_LO_APPLY=YES to use --write');
}
if (unmatched.length) {
  // A code the database does not know means the catalogue and the live tree have
  // diverged; writing the rest would leave a partially described syllabus.
  throw new Error(`refusing to write: unmatched subtopic codes ${unmatched.join(', ')}`);
}

const client = await pool.connect();
let inserted = 0;
try {
  await client.query('begin');
  for (const subtopic of wanted) {
    const subtopicId = idByCode.get(subtopic.code)!;
    for (const objective of subtopic.learningObjectives) {
      const result = await client.query(
        `insert into learning_objectives (subtopic_id, code, text, sort_order)
         values ($1, $2, $3, $4)
         on conflict (subtopic_id, code) do nothing`,
        [subtopicId, objective.code, objective.text, objective.sortOrder],
      );
      inserted += result.rowCount ?? 0;
    }
  }
  await client.query('commit');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
}

const total = await pool.query<{ n: string }>(
  `select count(*) n from learning_objectives lo
   join subtopics st on st.id = lo.subtopic_id
   join topics t on t.id = st.topic_id
   join syllabi s on s.id = t.syllabus_id
   where s.code = $1 and s.is_active`,
  [catalog.code],
);
console.log(`\ninserted ${inserted}; syllabus now has ${total.rows[0]!.n} learning objectives`);
await pool.end();
