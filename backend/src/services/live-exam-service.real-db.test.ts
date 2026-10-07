import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import { LiveExamService } from './live-exam-service.js';

const describeLive = process.env.LIVE_DB_ACCEPTANCE === '1' ? describe : describe.skip;

describeLive('LiveExamService real PostgreSQL lifecycle', () => {
  let pool: Pool;
  let client: PoolClient;
  let service: LiveExamService;
  let schoolId = '';
  let ownerId = '';
  let classId = '';
  let questionId = '';
  let syllabusId = '';
  let loId = '';
  const studentIds: string[] = [];
  const pointId = '22222222-2222-4222-8222-222222222222';

  const owner = (): Actor => ({
    id: ownerId,
    role: 'owner',
    schoolId,
    fullName: 'Acceptance owner',
  });
  const student = (index: number): Actor => ({
    id: studentIds[index]!,
    role: 'student',
    schoolId,
    fullName: `Acceptance student ${index + 1}`,
  });

  async function makeSession(input: {
    code: string;
    markingMode?: 'teacher'|'peer'|'self';
    timeLimit?: number | null;
    settings?: Record<string, unknown>;
    participants?: number[];
  }) {
    const sessionId = (await client.query<{id:string}>(
      `insert into live_exam_sessions
        (class_id,host_id,title,join_code,marking_mode,question_time_limit_s,settings)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb) returning id`,
      [
        classId,
        ownerId,
        `Lifecycle ${input.code}`,
        input.code,
        input.markingMode ?? 'teacher',
        input.timeLimit ?? null,
        JSON.stringify(input.settings ?? {}),
      ],
    )).rows[0]!.id;
    const scheme = {
      id: '33333333-3333-4333-8333-333333333333',
      schemeType: 'points',
      maxMarks: 1,
      guidanceMd: null,
      levels: [],
      groups: [],
      points: [{
        id: pointId,
        code: 'M1',
        text: 'One mark',
        marks: 1,
        accept: null,
        reject: null,
        requires: [],
        isBod: false,
        groupId: null,
      }],
    };
    const sessionQuestionId = (await client.query<{id:string}>(
      `insert into live_exam_questions
        (session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot)
       values ($1,$2,0,1,'{}'::jsonb,$3::jsonb) returning id`,
      [sessionId,questionId,JSON.stringify(scheme)],
    )).rows[0]!.id;
    for (const index of input.participants ?? []) {
      await client.query(
        'insert into live_exam_participants (session_id,student_id) values ($1,$2)',
        [sessionId,studentIds[index]],
      );
    }
    return { sessionId, sessionQuestionId };
  }

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required for LIVE_DB_ACCEPTANCE');
    pool = new Pool({ connectionString });
    client = await pool.connect();

    schoolId = (await client.query<{id:string}>(
      "insert into schools (name) values ('Lifecycle school') returning id",
    )).rows[0]!.id;
    ownerId = (await client.query<{id:string}>(
      "insert into users (school_id,role,full_name) values ($1,'owner','Acceptance owner') returning id",
      [schoolId],
    )).rows[0]!.id;
    for (let index=0; index<3; index+=1) {
      studentIds.push((await client.query<{id:string}>(
        "insert into users (school_id,role,full_name) values ($1,'student',$2) returning id",
        [schoolId,`Acceptance student ${index+1}`],
      )).rows[0]!.id);
    }
    syllabusId = (await client.query<{id:string}>(
      "insert into syllabi (code) values ('9618') returning id",
    )).rows[0]!.id;
    const topicId = (await client.query<{id:string}>(
      'insert into topics (syllabus_id,number) values ($1,1) returning id',
      [syllabusId],
    )).rows[0]!.id;
    const subtopicId = (await client.query<{id:string}>(
      "insert into subtopics (topic_id,code) values ($1,'1.1') returning id",
      [topicId],
    )).rows[0]!.id;
    loId = (await client.query<{id:string}>(
      'insert into learning_objectives (subtopic_id) values ($1) returning id',
      [subtopicId],
    )).rows[0]!.id;
    classId = (await client.query<{id:string}>(
      `insert into classes (school_id,syllabus_id,owner_id,name)
       values ($1,$2,$3,'Lifecycle class') returning id`,
      [schoolId,syllabusId,ownerId],
    )).rows[0]!.id;
    for (const id of studentIds) {
      await client.query('insert into enrollments (class_id,student_id) values ($1,$2)',[classId,id]);
    }
    questionId = (await client.query<{id:string}>(
      'insert into questions default values returning id',
    )).rows[0]!.id;
    await client.query(
      'insert into question_learning_objectives (question_id,lo_id,confidence) values ($1,$2,1)',
      [questionId,loId],
    );
    await client.query(
      `insert into question_subtopics (question_id,subtopic_id,is_primary,confidence)
       values ($1,$2,true,1)`,
      [questionId,subtopicId],
    );

    service = new LiveExamService(pool, {} as PgQuestionsRepository);
  }, 30_000);

  afterAll(async () => {
    if (client) {
      await client.query('delete from mastery where student_id=any($1::uuid[])',[studentIds]).catch(()=>{});
      if (classId) await client.query('delete from classes where id=$1',[classId]).catch(()=>{});
      if (questionId) await client.query('delete from questions where id=$1',[questionId]).catch(()=>{});
      if (studentIds.length || ownerId) {
        await client.query('delete from users where id=any($1::uuid[])',[[ownerId,...studentIds].filter(Boolean)]).catch(()=>{});
      }
      if (syllabusId) await client.query('delete from syllabi where id=$1',[syllabusId]).catch(()=>{});
      if (schoolId) await client.query('delete from schools where id=$1',[schoolId]).catch(()=>{});
      client.release();
    }
    if (pool) await pool.end();
  });

  it('runs a three-learner peer round through pause, resume, force-complete and learning evidence', async () => {
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'820001',
      markingMode:'peer',
      timeLimit:120,
      participants:[0,1,2],
    });

    const started=await service.start(owner(),sessionId,1);
    expect(started).toMatchObject({status:'question_open',version:2});

    const paused=await service.pause(owner(),sessionId,2);
    expect(paused).toMatchObject({paused:true,version:3});
    await expect(service.saveAnswer(student(0),sessionId,'blocked while paused'))
      .rejects.toMatchObject({code:'live_answer_locked',status:409});

    const resumed=await service.resume(owner(),sessionId,3);
    expect(resumed).toMatchObject({paused:false,version:4});

    for (let index=0; index<3; index+=1) {
      await service.submitAnswer(student(index),sessionId,`answer ${index+1}`);
    }

    await expect(service.leave(student(0),sessionId))
      .rejects.toMatchObject({code:'live_invalid_state',status:409});

    const revealed=await service.revealMarkScheme(owner(),sessionId);
    expect(revealed.status).toBe('marking');

    const assignments=await client.query<{answer_student:string;reviewer_id:string;kind:string}>(
      `select p.student_id::text answer_student,r.reviewer_id::text,r.kind::text
       from live_exam_reviews r
       join live_exam_answers a on a.id=r.answer_id
       join live_exam_participants p on p.id=a.participant_id
       where r.session_question_id=$1 order by p.student_id`,
      [sessionQuestionId],
    );
    expect(assignments.rowCount).toBe(3);
    expect(assignments.rows.every((row)=>row.kind==='peer' && row.answer_student!==row.reviewer_id)).toBe(true);

    await expect(service.completeMarking(owner(),sessionId,false))
      .rejects.toMatchObject({code:'live_reviews_pending',status:409});
    const completed=await service.completeMarking(owner(),sessionId,true);
    expect(completed.status).toBe('review');

    const finished=await service.nextQuestion(owner(),sessionId);
    expect(finished.status).toBe('finished');

    expect(Number((await client.query(
      'select count(*) count from live_exam_learning_evidence where session_id=$1',
      [sessionId],
    )).rows[0].count)).toBe(3);
    expect(Number((await client.query(
      'select count(*) count from mastery where student_id=any($1::uuid[])',
      [studentIds],
    )).rows[0].count)).toBe(3);
    expect(Number((await client.query(
      'select count(*) count from live_exam_answers a join live_exam_questions q on q.id=a.session_question_id where q.session_id=$1 and a.final_score=0',
      [sessionId],
    )).rows[0].count)).toBe(3);
  });

  it('allows configured late join and creates the current-round answer atomically', async () => {
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'820002',
      markingMode:'teacher',
      settings:{allowLateJoin:true},
      participants:[0],
    });
    await service.start(owner(),sessionId,1);

    const joined=await service.join(student(1),'820002');
    expect(joined.sessionId).toBe(sessionId);
    const answer=await client.query(
      `select 1 from live_exam_answers a
       join live_exam_participants p on p.id=a.participant_id
       where a.session_question_id=$1 and p.student_id=$2 and p.left_at is null`,
      [sessionQuestionId,studentIds[1]],
    );
    expect(answer.rowCount).toBe(1);
    await expect(service.leave(student(1),sessionId))
      .rejects.toMatchObject({code:'live_invalid_state',status:409});
  });

  it('reconciles an expired timed round from the database clock exactly once', async () => {
    const {sessionId}=await makeSession({
      code:'820003',
      markingMode:'teacher',
      timeLimit:30,
      participants:[2],
    });
    await service.start(owner(),sessionId,1);
    await client.query(
      "update live_exam_sessions set question_started_at=now()-interval '45 seconds' where id=$1",
      [sessionId],
    );

    expect(await service.closeExpired(20)).toBeGreaterThanOrEqual(1);
    expect((await client.query<{status:string}>(
      'select status::text status from live_exam_sessions where id=$1',
      [sessionId],
    )).rows[0]?.status).toBe('marking');
    expect(await service.closeExpired(20)).toBe(0);
  });
});
