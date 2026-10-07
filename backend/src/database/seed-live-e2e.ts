import { pool } from './client.js';
import { questionVisualIntegritySql } from '../lib/source-visual-readiness.js';

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

  const classRow=await client.query<{id:string}>(
    `select id from classes where name='10-A CS' order by created_at limit 1`,
  );
  const classId=classRow.rows[0]?.id;
  if(!classId)throw new Error('Live E2E class fixture missing');

  const gates=await client.query(
    `select
       q.status='approved' as approved,
       coalesce(q.marks,0)>0 as marked,
       exists(
         select 1 from canonical_mark_schemes ms
         where ms.question_id=q.id and ms.status='approved'
       ) as mark_scheme_ready,
       ${questionVisualIntegritySql('q')} as visual_ready,
       exists(
         select 1
         from classes live_class
         where live_class.id=$2
           and exists(
             select 1
             from question_subtopics qst
             join subtopics source_st on source_st.id=qst.subtopic_id
             join topics source_t on source_t.id=source_st.topic_id
             join topics target_t
               on target_t.syllabus_id=live_class.syllabus_id
              and target_t.number=source_t.number
             join subtopics target_st
               on target_st.topic_id=target_t.id
              and target_st.code=source_st.code
             where qst.question_id=q.id
               and qst.is_primary
               and coalesce(qst.confidence,0)>=0.95
           )
       ) as class_syllabus_ready,
       exists(
         select 1 from question_subtopics qst
         join subtopics mapped_subtopic on mapped_subtopic.id=qst.subtopic_id
         join topics mapped_topic on mapped_topic.id=mapped_subtopic.topic_id
         join syllabi mapped_syllabus on mapped_syllabus.id=mapped_topic.syllabus_id
         where qst.question_id=q.id and exists(
           select 1 from topics selected_topic
           join syllabi selected_syllabus on selected_syllabus.id=selected_topic.syllabus_id
           where selected_topic.id=$3
             and selected_syllabus.code=mapped_syllabus.code
             and selected_topic.number=mapped_topic.number
         )
       ) as topic_ready,
       not exists(
         select 1 from assignment_questions aq
         join assignments a on a.id=aq.assignment_id
         where aq.question_id=q.id and a.class_id=$2
       ) as assignment_unseen,
       not exists(
         select 1 from live_exam_questions leq
         join live_exam_sessions previous on previous.id=leq.session_id
         where leq.question_id=q.id and previous.class_id=$2
           and previous.started_at is not null
       ) as live_unseen
     from questions q where q.id=$1`,
    [questionId,classId,topicId],
  );
  const readiness=gates.rows[0] as Record<string,boolean>|undefined;
  console.log('Live E2E eligibility gates',JSON.stringify(readiness));
  if(!readiness||Object.values(readiness).some((value)=>value!==true)){
    throw new Error(`Live E2E eligibility fixture failed: ${JSON.stringify(readiness)}`);
  }

  await client.query('commit');
  console.log('Seeded verified users and deterministic canonical Live E2E fixture');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}
