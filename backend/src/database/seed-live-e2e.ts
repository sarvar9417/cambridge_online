import { pool } from './client.js';

if (!pool) throw new Error('DATABASE_URL is required');

const client = await pool.connect();

try {
  await client.query('begin');

  const topic = await client.query<{ id:string }>(
    `select t.id
     from topics t
     join syllabi s on s.id=t.syllabus_id
     where s.code='9618' and t.number=1
     order by s.valid_from desc
     limit 1`,
  );
  const topicId = topic.rows[0]?.id;
  if (!topicId) throw new Error('9618 topic 1 is required for Live E2E');

  await client.query(
    `insert into subtopics(topic_id,code,title,sort_order)
     values($1,'1.1','Binary number systems',1)
     on conflict(topic_id,code) do nothing`,
    [topicId],
  );
  const subtopic = await client.query<{ id:string }>(
    `select id from subtopics where topic_id=$1 and code='1.1' limit 1`,
    [topicId],
  );
  const subtopicId = subtopic.rows[0]?.id;
  if (!subtopicId) throw new Error('Live E2E subtopic seed failed');

  const question = await client.query<{ id:string }>(
    `select id
     from questions
     where display_ref='9618/11/M/J/26 Q1(a)'
       and status='approved'
       and marks>0
     order by created_at desc
     limit 1`,
  );
  const questionId = question.rows[0]?.id;
  if (!questionId) throw new Error('Run db:seed before db:seed:live-e2e');

  await client.query(
    `update question_subtopics
     set is_primary=false
     where question_id=$1 and is_primary and subtopic_id<>$2`,
    [questionId, subtopicId],
  );
  await client.query(
    `insert into question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by)
     values($1,$2,true,1,1,'live-e2e')
     on conflict(question_id,subtopic_id) do update set
       is_primary=true,
       weight=1,
       confidence=1,
       set_by='live-e2e'`,
    [questionId, subtopicId],
  );

  await client.query('commit');
  console.log('Seeded deterministic Live E2E taxonomy fixture');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}
