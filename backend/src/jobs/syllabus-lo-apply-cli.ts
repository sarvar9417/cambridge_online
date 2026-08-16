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
 * When an objective explicitly declares `componentNumbers`, this command also
 * writes the matching `component_learning_objectives` rows. Coverage is never
 * inferred here: omitted componentNumbers mean "leave coverage unchanged".
 *
 *   CONFIRM_SYLLABUS_LO_APPLY=YES npx tsx backend/src/jobs/syllabus-lo-apply-cli.ts \
 *     --file=backend/src/database/syllabus/9618-2026-lo-additions.json --write
 */
const arg = (name: string) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);

const file = arg('file');
const write = process.argv.includes('--write');
if (!file) throw new Error('Usage: --file=<catalog.json> [--write]');
if (!pool) throw new Error('DATABASE_URL is required');

interface CatalogObjective {
  code: string;
  text: string;
  sortOrder: number;
  componentNumbers?: number[];
}

interface Catalog {
  code: string;
  topics: Array<{
    subtopics: Array<{
      code: string;
      learningObjectives: CatalogObjective[];
    }>;
  }>;
}

const catalog = JSON.parse(await readFile(file, 'utf8')) as Catalog;
const wanted = catalog.topics.flatMap((topic) => topic.subtopics);
const wantedObjectives = wanted.flatMap((subtopic) =>
  subtopic.learningObjectives.map((objective) => ({ subtopicCode: subtopic.code, ...objective })),
);

const existing = await pool.query<{ id: string; code: string }>(
  `select st.id, st.code
   from subtopics st
   join topics t on t.id = st.topic_id
   join syllabi s on s.id = t.syllabus_id
   where s.code = $1 and s.is_active`,
  [catalog.code],
);
const idByCode = new Map(existing.rows.map((row) => [row.code, row.id]));

const components = await pool.query<{ id: string; number: number }>(
  `select c.id, c.number
   from components c
   join syllabi s on s.id=c.syllabus_id
   where s.code=$1 and s.is_active`,
  [catalog.code],
);
const componentIdByNumber = new Map(components.rows.map((row) => [row.number, row.id]));

const existingObjectives = await pool.query<{
  id: string;
  subtopic_code: string;
  code: string;
  text: string;
  sort_order: number;
}>(
  `select lo.id,st.code subtopic_code,lo.code,lo.text,lo.sort_order
   from learning_objectives lo
   join subtopics st on st.id=lo.subtopic_id
   join topics t on t.id=st.topic_id
   join syllabi s on s.id=t.syllabus_id
   where s.code=$1 and s.is_active`,
  [catalog.code],
);
const existingObjectiveByKey = new Map(
  existingObjectives.rows.map((row) => [`${row.subtopic_code}:${row.code}`, row]),
);

const unmatched = wanted.filter((subtopic) => !idByCode.has(subtopic.code)).map((s) => s.code);
const requestedComponentNumbers = new Set(
  wantedObjectives.flatMap((objective) => objective.componentNumbers ?? []),
);
const unmatchedComponentNumbers = [...requestedComponentNumbers].filter(
  (number) => !componentIdByNumber.has(number),
);
const collisions = wantedObjectives.flatMap((objective) => {
  const found = existingObjectiveByKey.get(`${objective.subtopicCode}:${objective.code}`);
  if (!found) return [];
  if (found.text === objective.text && found.sort_order === objective.sortOrder) return [];
  return [`${objective.subtopicCode}:${objective.code}`];
});
const coverageLinkCount = wantedObjectives.reduce(
  (sum, objective) => sum + (objective.componentNumbers?.length ?? 0),
  0,
);
const alreadyPresent = wantedObjectives.filter((objective) =>
  existingObjectiveByKey.has(`${objective.subtopicCode}:${objective.code}`),
).length;

console.log(`subtopics in catalog : ${wanted.length}`);
console.log(`matched in database  : ${wanted.length - unmatched.length}`);
console.log(`objectives requested : ${wantedObjectives.length}`);
console.log(`already present      : ${alreadyPresent}`);
console.log(`new objectives       : ${wantedObjectives.length - alreadyPresent}`);
console.log(`coverage links       : ${coverageLinkCount}`);
if (unmatched.length) console.log(`unmatched codes      : ${unmatched.join(', ')}`);
if (unmatchedComponentNumbers.length) {
  console.log(`unknown components   : ${unmatchedComponentNumbers.join(', ')}`);
}
if (collisions.length) console.log(`objective collisions : ${collisions.join(', ')}`);

if (!write) {
  console.log('\nDry run. Pass --write to apply.');
  await pool.end();
  process.exit(0);
}
if (process.env.CONFIRM_SYLLABUS_LO_APPLY !== 'YES') {
  throw new Error('Set CONFIRM_SYLLABUS_LO_APPLY=YES to use --write');
}
if (unmatched.length) {
  throw new Error(`refusing to write: unmatched subtopic codes ${unmatched.join(', ')}`);
}
if (unmatchedComponentNumbers.length) {
  throw new Error(`refusing to write: unknown component numbers ${unmatchedComponentNumbers.join(', ')}`);
}
if (collisions.length) {
  throw new Error(`refusing to write: existing objective differs ${collisions.join(', ')}`);
}

const client = await pool.connect();
let inserted = 0;
let coverageInserted = 0;
try {
  await client.query('begin');
  for (const subtopic of wanted) {
    const subtopicId = idByCode.get(subtopic.code)!;
    for (const objective of subtopic.learningObjectives) {
      const result = await client.query(
        `insert into learning_objectives (subtopic_id, code, text, sort_order)
         values ($1, $2, $3, $4)
         on conflict (subtopic_id, code) do nothing
         returning id`,
        [subtopicId, objective.code, objective.text, objective.sortOrder],
      );
      inserted += result.rowCount ?? 0;

      const objectiveId = result.rows[0]?.id ?? existingObjectiveByKey.get(`${subtopic.code}:${objective.code}`)?.id;
      if (!objectiveId) {
        throw new Error(`failed to resolve learning objective ${subtopic.code}:${objective.code}`);
      }

      for (const componentNumber of objective.componentNumbers ?? []) {
        const componentId = componentIdByNumber.get(componentNumber)!;
        const coverage = await client.query(
          `insert into component_learning_objectives(component_id, learning_objective_id)
           values($1,$2)
           on conflict(component_id,learning_objective_id) do nothing`,
          [componentId, objectiveId],
        );
        coverageInserted += coverage.rowCount ?? 0;
      }
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
console.log(`\ninserted ${inserted}; coverage inserted ${coverageInserted}; syllabus now has ${total.rows[0]!.n} learning objectives`);
await pool.end();
