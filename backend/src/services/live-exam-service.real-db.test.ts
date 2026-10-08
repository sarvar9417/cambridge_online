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
  let sameSchoolGuestId = '';
  let otherSchoolId = '';
  let otherSchoolStudentId = '';
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
  const sameSchoolGuest = (): Actor => ({
    id: sameSchoolGuestId,
    role: 'student',
    schoolId,
    fullName: 'Same-school Live guest',
  });
  const otherSchoolStudent = (): Actor => ({
    id: otherSchoolStudentId,
    role: 'student',
    schoolId: otherSchoolId,
    fullName: 'Other-school student',
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
    sameSchoolGuestId = (await client.query<{id:string}>(
      "insert into users (school_id,role,full_name) values ($1,'student','Same-school Live guest') returning id",
      [schoolId],
    )).rows[0]!.id;
    otherSchoolId = (await client.query<{id:string}>(
      "insert into schools (name) values ('Other lifecycle school') returning id",
    )).rows[0]!.id;
    otherSchoolStudentId = (await client.query<{id:string}>(
      "insert into users (school_id,role,full_name) values ($1,'student','Other-school student') returning id",
      [otherSchoolId],
    )).rows[0]!.id;
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
      await client.query('delete from mastery where student_id=any($1::uuid[])',[[...studentIds,sameSchoolGuestId,otherSchoolStudentId].filter(Boolean)]).catch(()=>{});
      if (classId) await client.query('delete from classes where id=$1',[classId]).catch(()=>{});
      if (questionId) await client.query('delete from questions where id=$1',[questionId]).catch(()=>{});
      if (studentIds.length || ownerId || sameSchoolGuestId || otherSchoolStudentId) {
        await client.query('delete from users where id=any($1::uuid[])',[[ownerId,...studentIds,sameSchoolGuestId,otherSchoolStudentId].filter(Boolean)]).catch(()=>{});
      }
      if (syllabusId) await client.query('delete from syllabi where id=$1',[syllabusId]).catch(()=>{});
      if (otherSchoolId) await client.query('delete from schools where id=$1',[otherSchoolId]).catch(()=>{});
      if (schoolId) await client.query('delete from schools where id=$1',[schoolId]).catch(()=>{});
      client.release();
    }
    if (pool) await pool.end();
  });

  it('lets an active same-school student join by code without class enrolment and blocks another school', async () => {
    const {sessionId}=await makeSession({
      code:'829901',
      settings:{allowLateJoin:true},
    });

    const guestEnrollment=await client.query(
      'select 1 from enrollments where class_id=$1 and student_id=$2 and left_at is null',
      [classId,sameSchoolGuestId],
    );
    expect(guestEnrollment.rowCount).toBe(0);

    await expect(service.join(sameSchoolGuest(),'829901')).resolves.toMatchObject({sessionId});

    const participant=await client.query(
      'select 1 from live_exam_participants where session_id=$1 and student_id=$2 and left_at is null',
      [sessionId,sameSchoolGuestId],
    );
    expect(participant.rowCount).toBe(1);

    const stillNotEnrolled=await client.query(
      'select 1 from enrollments where class_id=$1 and student_id=$2 and left_at is null',
      [classId,sameSchoolGuestId],
    );
    expect(stillNotEnrolled.rowCount).toBe(0);

    await expect(service.join(otherSchoolStudent(),'829901'))
      .rejects.toMatchObject({code:'live_code_not_found',status:404});
  });

  it('keeps peer marks provisional until the teacher releases the round', async () => {
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

    const assignments=await client.query<{review_id:string;answer_student:string;reviewer_id:string;kind:string}>(
      `select r.id::text review_id,p.student_id::text answer_student,r.reviewer_id::text,r.kind::text
       from live_exam_reviews r
       join live_exam_answers a on a.id=r.answer_id
       join live_exam_participants p on p.id=a.participant_id
       where r.session_question_id=$1 order by p.student_id`,
      [sessionQuestionId],
    );
    expect(assignments.rowCount).toBe(3);
    expect(assignments.rows.every((row)=>row.kind==='peer' && row.answer_student!==row.reviewer_id)).toBe(true);

    for (const assignment of assignments.rows) {
      const reviewerIndex=studentIds.indexOf(assignment.reviewer_id);
      expect(reviewerIndex).toBeGreaterThanOrEqual(0);
      await service.submitReview(student(reviewerIndex),sessionId,assignment.review_id,{
        matchedPointIds:[pointId],
        feedback:'peer checked',
      });
    }

    const beforeRelease=await client.query(
      `select a.final_score,r.awarded_marks,r.status::text
       from live_exam_answers a
       join live_exam_reviews r on r.answer_id=a.id
       where a.session_question_id=$1`,
      [sessionQuestionId],
    );
    expect(beforeRelease.rows.every((row)=>row.final_score===null)).toBe(true);
    expect(beforeRelease.rows.every((row)=>Number(row.awarded_marks)===1&&row.status==='submitted')).toBe(true);

    const completed=await service.completeMarking(owner(),sessionId,false);
    expect(completed.status).toBe('review');

    const released=await client.query(
      'select final_score,score_source::text from live_exam_answers where session_question_id=$1',
      [sessionQuestionId],
    );
    expect(released.rows.every((row)=>Number(row.final_score)===1&&row.score_source==='peer')).toBe(true);

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
  });

  it('reassigns unfinished peer reviews to the teacher instead of forcing zero marks', async () => {
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'820004',
      markingMode:'peer',
      participants:[0,1,2],
    });
    await service.start(owner(),sessionId,1);
    for (let index=0; index<3; index+=1) {
      await service.submitAnswer(student(index),sessionId,`fallback answer ${index+1}`);
    }
    await service.revealMarkScheme(owner(),sessionId);

    const peerReviews=await client.query<{id:string;reviewer_id:string}>(
      'select id::text,reviewer_id::text from live_exam_reviews where session_question_id=$1 order by id',
      [sessionQuestionId],
    );
    const firstReviewer=studentIds.indexOf(peerReviews.rows[0]!.reviewer_id);
    await service.submitReview(student(firstReviewer),sessionId,peerReviews.rows[0]!.id,{
      matchedPointIds:[pointId],
    });

    const fallback=await service.completeMarking(owner(),sessionId,true);
    expect(fallback).toMatchObject({status:'marking',fallbackAssigned:2});

    const reassigned=await client.query<{id:string;reviewer_id:string;kind:string;status:string}>(
      `select id::text,reviewer_id::text,kind::text,status::text
       from live_exam_reviews where session_question_id=$1 order by id`,
      [sessionQuestionId],
    );
    const teacherPending=reassigned.rows.filter((row)=>row.status==='assigned');
    expect(teacherPending).toHaveLength(2);
    expect(teacherPending.every((row)=>row.kind==='teacher'&&row.reviewer_id===ownerId)).toBe(true);
    expect(Number((await client.query(
      'select count(*) count from live_exam_answers where session_question_id=$1 and final_score=0',
      [sessionQuestionId],
    )).rows[0].count)).toBe(0);

    for (const review of teacherPending) {
      await service.submitReview(owner(),sessionId,review.id,{matchedPointIds:[pointId]});
    }
    const completed=await service.completeMarking(owner(),sessionId,false);
    expect(completed.status).toBe('review');

    const released=await client.query(
      'select final_score,score_source::text from live_exam_answers where session_question_id=$1',
      [sessionQuestionId],
    );
    expect(released.rows.every((row)=>Number(row.final_score)===1)).toBe(true);
  });

  it('uses teacher fallback for a one-learner peer round', async () => {
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'820005',
      markingMode:'peer',
      participants:[0],
    });
    await service.start(owner(),sessionId,1);
    await service.submitAnswer(student(0),sessionId,'single learner answer');
    await service.revealMarkScheme(owner(),sessionId);

    const review=await client.query<{reviewer_id:string;kind:string}>(
      'select reviewer_id::text,kind::text from live_exam_reviews where session_question_id=$1',
      [sessionQuestionId],
    );
    expect(review.rows[0]).toEqual({reviewer_id:ownerId,kind:'teacher'});
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

  it('removes only terminal sessions from history without deleting their evidence', async () => {
    const active=await makeSession({code:'820006',markingMode:'teacher'});
    await expect(service.archiveHistory(owner(),active.sessionId))
      .rejects.toMatchObject({code:'live_archive_active_session',status:409});

    const terminal=await makeSession({code:'820007',markingMode:'teacher'});
    const cancelled=await service.cancel(owner(),terminal.sessionId,1);
    expect(cancelled.status).toBe('cancelled');

    const archived=await service.archiveHistory(owner(),terminal.sessionId);
    expect(archived).toMatchObject({sessionId:terminal.sessionId,archived:true});

    const row=await client.query<{archived_at:Date|null;question_count:number;event_count:number}>(
      `select les.archived_at,
         (select count(*)::int from live_exam_questions leq where leq.session_id=les.id) question_count,
         (select count(*)::int from live_exam_events e where e.session_id=les.id and e.event_type='session.history_archived') event_count
       from live_exam_sessions les where les.id=$1`,
      [terminal.sessionId],
    );
    expect(row.rows[0]?.archived_at).not.toBeNull();
    expect(Number(row.rows[0]?.question_count)).toBe(1);
    expect(Number(row.rows[0]?.event_count)).toBe(1);

    const listed=await service.list(owner());
    expect(listed.some((session)=>session.id===terminal.sessionId)).toBe(false);
    await expect(service.snapshot(owner(),terminal.sessionId))
      .rejects.toMatchObject({code:'not_found',status:404});
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
