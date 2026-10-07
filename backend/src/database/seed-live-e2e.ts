import { pool } from './client.js';

if (!pool) throw new Error('DATABASE_URL is required');
const rawUrl=process.env.DATABASE_URL;
if(!rawUrl)throw new Error('DATABASE_URL is required');
const databaseHost=new URL(rawUrl).hostname;
if(!['127.0.0.1','localhost','::1'].includes(databaseHost)){
  throw new Error('Refusing to seed Live E2E outside localhost');
}

const client = await pool.connect();

try {
  await client.query('begin');

  await client.query(
    `update users
     set email_verified_at=coalesce(email_verified_at,now()),
         status='active'
     where username=any($1::text[])`,
    [[process.env.SEED_OWNER_USERNAME ?? 'qa-owner','student01','student02','student03']],
  );

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
    `update questions q
     set content_json=jsonb_build_object(
           'version',1,
           'source',jsonb_build_object('paperId',q.source_paper_id::text,'sha256',sp.sha256),
           'blocks',jsonb_build_array(
             jsonb_build_object(
               'type','text',
               'style','task',
               'text',q.stem_md,
               'source',jsonb_build_object('page',2)
             )
           )
         ),
         content_version=1,
         updated_at=now()
     from source_papers sp
     where q.id=$1 and sp.id=q.source_paper_id`,
    [questionId],
  );

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
  console.log('Seeded verified users and deterministic canonical Live E2E fixture');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}
