import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { AssetUrlSigner } from '../jobs/asset-store.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import { LiveExamService, LIVE_FIXED_SOURCE_ORDER_SQL } from './live-exam-service.js';
import { LiveExamRealtimeService } from './live-exam-realtime-service.js';
import { expandExplicitLiveMarkPoints } from '../lib/live-explicit-mark-points.js';

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
  const loadStudentIds: string[] = [];
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
    markScheme?: Record<string,unknown>;
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
      schemeType: 'all_required',
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
    const finalScheme=input.markScheme??scheme;
    const sessionQuestionId = (await client.query<{id:string}>(
      `insert into live_exam_questions
        (session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot)
       values ($1,$2,0,$3,'{}'::jsonb,$4::jsonb) returning id`,
      [sessionId,questionId,Number(finalScheme.maxMarks),JSON.stringify(finalScheme)],
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
      await client.query('delete from mastery where student_id=any($1::uuid[])',[[...studentIds,...loadStudentIds,sameSchoolGuestId,otherSchoolStudentId].filter(Boolean)]).catch(()=>{});
      if (classId) await client.query('delete from classes where id=$1',[classId]).catch(()=>{});
      if (questionId) await client.query('delete from questions where id=$1',[questionId]).catch(()=>{});
      if (studentIds.length || loadStudentIds.length || ownerId || sameSchoolGuestId || otherSchoolStudentId) {
        await client.query('delete from users where id=any($1::uuid[])',[[ownerId,...studentIds,...loadStudentIds,sameSchoolGuestId,otherSchoolStudentId].filter(Boolean)]).catch(()=>{});
      }
      if (syllabusId) await client.query('delete from syllabi where id=$1',[syllabusId]).catch(()=>{});
      if (otherSchoolId) await client.query('delete from schools where id=$1',[otherSchoolId]).catch(()=>{});
      if (schoolId) await client.query('delete from schools where id=$1',[schoolId]).catch(()=>{});
      client.release();
    }
    if (pool) await pool.end();
  });

  it('lets only an enrolled student-host control their own solo practice and blocks join-by-code', async()=>{
    const {sessionId}=await makeSession({
      code:'829984',markingMode:'self',settings:{practiceMode:'solo'},participants:[0],
    });
    await client.query('update live_exam_sessions set host_id=$2 where id=$1',[sessionId,studentIds[0]]);
    const rows=await service.list(student(0));
    expect(rows.some(row=>row.id===sessionId && row.settings.practiceMode==='solo')).toBe(true);
    const lobby=await service.snapshot(student(0),sessionId) as {
      session:{isHost:boolean};participants:unknown[];teacherAnswers:unknown[];questions:unknown[];
    };
    expect(lobby.session.isHost).toBe(true);
    expect(lobby.participants).toEqual([]);
    expect(lobby.teacherAnswers).toEqual([]);
    expect(lobby.questions).toEqual([]);
    await expect(service.join(student(1),'829984')).rejects.toThrow();
    await expect(service.start(student(1),sessionId)).rejects.toThrow();
    await expect(service.moderateAnswer(student(0),sessionId,questionId,{score:1})).rejects.toThrow();
    await expect(service.leave(student(0),sessionId)).rejects.toThrow();
    const opened=await service.start(student(0),sessionId);
    expect(opened.status).toBe('question_open');
    await expect(service.completeMarking(student(0),sessionId,true)).rejects.toThrow();
    const cancelled=await service.cancel(student(0),sessionId);
    expect(cancelled.status).toBe('cancelled');
  });

  it('requires at least two members to start student-owned peer practice and checks join school',async()=>{
    const {sessionId}=await makeSession({
      code:'829985',markingMode:'peer',settings:{practiceMode:'group'},participants:[0],
    });
    await client.query('update live_exam_sessions set host_id=$2 where id=$1',[sessionId,studentIds[0]]);
    await expect(service.start(student(0),sessionId)).rejects.toThrow();
    await expect(service.join(otherSchoolStudent(),'829985')).rejects.toThrow();
    await expect(service.join(sameSchoolGuest(),'829985')).rejects.toThrow();
    const joined=await service.join(student(1),'829985');
    expect(joined.sessionId).toBe(sessionId);
    expect((await service.start(student(0),sessionId)).status).toBe('question_open');
    await service.cancel(student(0),sessionId);
  });

  it('keeps finished student practice marks out of official mastery and classroom exposures',async()=>{
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'829986',markingMode:'self',settings:{practiceMode:'solo'},participants:[0],
    });
    await client.query('update live_exam_sessions set host_id=$2 where id=$1',[sessionId,studentIds[0]]);
    const beforeMastery=Number((await client.query(
      'select count(*)::int count from mastery where student_id=$1',[studentIds[0]],
    )).rows[0].count);
    await service.start(student(0),sessionId);
    const exposureCount=Number((await client.query(
      'select count(*)::int count from class_question_exposures where live_session_question_id=$1',
      [sessionQuestionId],
    )).rows[0].count);
    expect(exposureCount).toBe(0);
    await expect(service.revealMarkScheme(student(0),sessionId)).rejects.toThrow();
    await service.submitAnswer(student(0),sessionId,'One mark');
    expect((await service.revealMarkScheme(student(0),sessionId)).status).toBe('marking');
    const review=(await client.query<{id:string}>(
      'select id from live_exam_reviews where session_question_id=$1 and reviewer_id=$2',
      [sessionQuestionId,studentIds[0]],
    )).rows[0]!;
    await service.submitReview(student(0),sessionId,review.id,{matchedPointIds:[pointId]});
    // The final self-review atomically releases the round, so there is no extra teacher step.
    expect((await client.query('select status::text from live_exam_sessions where id=$1',[sessionId])).rows[0].status).toBe('review');
    expect((await service.nextQuestion(student(0),sessionId)).status).toBe('finished');
    const evidence=Number((await client.query(
      'select count(*)::int count from live_exam_learning_evidence where session_id=$1',
      [sessionId],
    )).rows[0].count);
    expect(evidence).toBe(0);
    const afterMastery=Number((await client.query(
      'select count(*)::int count from mastery where student_id=$1',[studentIds[0]],
    )).rows[0].count);
    expect(afterMastery).toBe(beforeMastery);
  });

  it('creates student practice rooms with the host enrolled, fixed roster and bounded concurrency',async()=>{
    const portable={
      leaf:{
        id:questionId,rootId:questionId,label:'1',path:'1',displayRef:'PRACTICE 1',
        stem:'Name one fact',marks:1,commandWord:null,answerKind:'short_text',answerLines:1,
      },
      chain:[{id:questionId,label:'1',depth:0}],
      contextBlocks:[],dependencies:[],sourceRef:'PRACTICE 1',
    };
    const scheme={
      id:'33333333-3333-4333-8333-333333333333',
      schemeType:'all_required',maxMarks:1,guidanceMd:null,levels:[],groups:[],
      points:[{id:pointId,code:'M1',text:'One mark',marks:1,
        accept:null,reject:null,requires:[],isBod:false,groupId:null}],
    };
    const creator=new LiveExamService(pool,{
      portable:async()=>portable,
    } as unknown as PgQuestionsRepository);
    const internal=creator as unknown as {
      chooseQuestionIds:()=>Promise<{ids:string[];total:number}>;
      expandRequiredDependencies:(ids:string[])=>Promise<string[]>;
      markScheme:()=>Promise<typeof scheme>;
    };
    internal.chooseQuestionIds=async()=>({ids:[questionId],total:1});
    internal.expandRequiredDependencies=async(ids)=>ids;
    internal.markScheme=async()=>scheme;
    const build=(practiceMode:'solo'|'group'|'collaborative')=>({
      classId,title:'Student source-backed practice',topicIds:[],subtopicIds:[],
      coursebookSectionCodes:['1.1'],questionCount:1,
      markingMode:practiceMode==='group'?'peer' as const:'self' as const,
      practiceMode,includeDiagrams:true,excludeSeen:false,
      allowLateJoin:true,teacherOverrideEnabled:false,peerCalibrationPercent:0,
    });
    const first=await creator.create(student(0),build('solo'));
    expect(first.questionCount).toBe(1);
    expect((await client.query(
      'select count(*)::int count from live_exam_participants where session_id=$1 and student_id=$2 and left_at is null',
      [first.id,studentIds[0]],
    )).rows[0].count).toBe(1);
    const saved=await client.query('select settings from live_exam_sessions where id=$1',[first.id]);
    expect(saved.rows[0].settings).toMatchObject({
      practiceMode:'solo',allowLateJoin:false,teacherOverrideEnabled:false,
    });
    await expect(creator.setLateJoin(student(0),String(first.id),true)).rejects.toThrow();
    const second=await creator.create(student(0),build('group'));
    const third=await creator.create(student(0),build('collaborative'));
    await expect(creator.create(student(0),build('solo')))
      .rejects.toMatchObject({code:'live_student_practice_limit',status:409});
    for(const id of [first.id,second.id,third.id])await creator.cancel(student(0),String(id));
    const active=await creator.create(student(0),build('solo'));
    const unauthorized=build('solo');
    await client.query('update enrollments set left_at=now() where class_id=$1 and student_id=$2',[classId,studentIds[0]]);
    await expect(creator.create(student(0),unauthorized)).rejects.toMatchObject({code:'not_found'});
    await expect(creator.cancel(student(0),String(active.id))).rejects.toMatchObject({code:'not_found',status:404});
    expect((await creator.snapshot(student(0),String(active.id)) as {
      session:{isHost:boolean};
    }).session.isHost).toBe(false);
    await client.query('update enrollments set left_at=null where class_id=$1 and student_id=$2',[classId,studentIds[0]]);
    await creator.cancel(student(0),String(active.id));
  });

  it('runs peer group practice from two submitted answers through anonymous reviews to finished',async()=>{
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'829987',markingMode:'peer',settings:{practiceMode:'group'},participants:[0,1],
    });
    await client.query('update live_exam_sessions set host_id=$2 where id=$1',[sessionId,studentIds[0]]);
    await service.start(student(0),sessionId);
    await service.submitAnswer(student(0),sessionId,'One mark');
    await service.submitAnswer(student(1),sessionId,'One mark');
    await service.revealMarkScheme(student(0),sessionId);
    const reviews=await client.query<{id:string;reviewer_id:string;owner_id:string}>(
      `select r.id,r.reviewer_id,lep.student_id owner_id
       from live_exam_reviews r
       join live_exam_answers a on a.id=r.answer_id
       join live_exam_participants lep on lep.id=a.participant_id
       where r.session_question_id=$1 and r.kind='peer'`,[sessionQuestionId],
    );
    expect(reviews.rows).toHaveLength(2);
    expect(reviews.rows.every(row=>row.reviewer_id!==row.owner_id)).toBe(true);
    for(const review of reviews.rows){
      const reviewer=[student(0),student(1)].find(item=>item.id===review.reviewer_id)!;
      await service.submitReview(reviewer,sessionId,review.id,{matchedPointIds:[pointId]});
    }
    expect((await client.query('select status::text from live_exam_sessions where id=$1',[sessionId])).rows[0].status).toBe('review');
    expect((await service.nextQuestion(student(0),sessionId)).status).toBe('finished');
  });

  it('lets multiple learners self-assess in collaborative practice without teacher scoring',async()=>{
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'829988',markingMode:'self',settings:{practiceMode:'collaborative'},participants:[0],
    });
    await client.query('update live_exam_sessions set host_id=$2 where id=$1',[sessionId,studentIds[0]]);
    await service.join(student(1),'829988');
    await service.start(student(0),sessionId);
    await service.submitAnswer(student(0),sessionId,'One mark');
    await service.submitAnswer(student(1),sessionId,'One mark');
    await service.revealMarkScheme(student(0),sessionId);
    const reviews=await client.query<{id:string;reviewer_id:string}>(
      `select id,reviewer_id from live_exam_reviews where session_question_id=$1 and kind='self'`,
      [sessionQuestionId],
    );
    expect(reviews.rows).toHaveLength(2);
    for(const review of reviews.rows){
      const reviewer=[student(0),student(1)].find(item=>item.id===review.reviewer_id)!;
      await service.submitReview(reviewer,sessionId,review.id,{matchedPointIds:[pointId]});
    }
    expect((await service.nextQuestion(student(0),sessionId)).status).toBe('finished');
  });

  it('caps actual PostgreSQL review MP awards at 3 for four source-derived criteria',async()=>{
    const base={
      id:'33333333-3333-4333-8333-333333333333',
      schemeType:'manual_only',maxMarks:3,
      guidanceMd:[
        '5(a) 1 mark for each point to max 3 3',
        '• The image is made of pixels',
        '• Each pixel has one colour',
        '• Each colour has a unique binary code',
        '• The code for each pixel is stored in sequence',
      ].join('\n'),
      levels:[],groups:[],points:[{
        id:pointId,code:'M1',text:'Combined 3-mark criterion',marks:3,
        accept:[],reject:[],requires:[],isBod:false,groupId:null,
      }],
    };
    const expanded=expandExplicitLiveMarkPoints(base);
    expect(expanded.schemeType).toBe('any_n_from_m');
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'829990',markingMode:'self',
      settings:{practiceMode:'solo'},participants:[0],markScheme:expanded,
    });
    await client.query('update live_exam_sessions set host_id=$2 where id=$1',[sessionId,studentIds[0]]);
    await service.start(student(0),sessionId);
    await service.submitAnswer(student(0),sessionId,'Pixels are coded in binary.');
    await service.revealMarkScheme(student(0),sessionId);
    const review=(await client.query<{id:string}>(
      'select id from live_exam_reviews where session_question_id=$1 and reviewer_id=$2',
      [sessionQuestionId,studentIds[0]],
    )).rows[0]!;
    await service.submitReview(student(0),sessionId,review.id,{
      matchedPointIds:expanded.points.map(point=>point.id),
    });
    const award=await client.query<{matched:number;credited:number;marks:number}>(
      `select count(*) filter(where matched)::int matched,
       count(*) filter(where awarded_marks>0)::int credited,
       coalesce(sum(awarded_marks),0)::int marks
       from live_exam_review_points where review_id=$1`,
      [review.id],
    );
    expect(award.rows[0]).toMatchObject({matched:4,credited:3,marks:3});
    const final=(await client.query<{final_score:number}>(
      'select final_score from live_exam_answers where session_question_id=$1',
      [sessionQuestionId],
    )).rows[0]!;
    expect(Number(final.final_score)).toBe(3);
  });

  it('does not let a learner create a staff-controlled Live session',async()=>{
    await expect(service.create(student(0),{
      classId,title:'Forbidden classroom impersonation',topicIds:[],subtopicIds:[],
      questionCount:1,markingMode:'teacher',includeDiagrams:true,excludeSeen:false,
    })).rejects.toThrow();
  });

  it('sorts extracted Q2(a)/Q2(b) before Q10 despite identical leaf sort_order on real PostgreSQL',async()=>{
    // Exact production comparator against the database engine and the same
    // query aliases, not a JavaScript approximation or a text-only assertion.
    const result=await client.query<{display_ref:string}>(`
      select candidate.display_ref from (values
        ('9618/11/M/J/26 Q10(a)',2026,'MJ',1,1,'q10'),
        ('9618/11/M/J/26 Q2(b)',2026,'MJ',1,1,'q2b'),
        ('9618/11/M/J/26 Q2(a)',2026,'MJ',1,1,'q2a')
      ) as candidate (display_ref,year,series,component,sort_order,id)
      order by ${LIVE_FIXED_SOURCE_ORDER_SQL}
    `);
    expect(result.rows.map(row=>row.display_ref)).toEqual([
      '9618/11/M/J/26 Q2(a)','9618/11/M/J/26 Q2(b)','9618/11/M/J/26 Q10(a)',
    ]);
  });

  it('lets authenticated students join by valid code without checking class or school membership', async () => {
    const {sessionId}=await makeSession({
      code:'829901',
      settings:{allowLateJoin:true},
    });

    for (const guest of [
      {actor:sameSchoolGuest(),id:sameSchoolGuestId},
      {actor:otherSchoolStudent(),id:otherSchoolStudentId},
    ]) {
      const before=await client.query(
        'select 1 from enrollments where class_id=$1 and student_id=$2 and left_at is null',
        [classId,guest.id],
      );
      expect(before.rowCount).toBe(0);

      await expect(service.join(guest.actor,'829901')).resolves.toMatchObject({sessionId});

      const participant=await client.query(
        'select 1 from live_exam_participants where session_id=$1 and student_id=$2 and left_at is null',
        [sessionId,guest.id],
      );
      expect(participant.rowCount).toBe(1);

      const after=await client.query(
        'select 1 from enrollments where class_id=$1 and student_id=$2 and left_at is null',
        [classId,guest.id],
      );
      expect(after.rowCount).toBe(0);
    }
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
    const provisionalStudent=await service.snapshot(student(0),sessionId);
    expect(provisionalStudent.ownPointFeedback).toBeNull();

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
    expect(beforeRelease.rows.every((row)=>Number(row.final_score)===1)).toBe(true);
    expect(beforeRelease.rows.every((row)=>Number(row.awarded_marks)===1&&row.status==='submitted')).toBe(true);
    const releasedState=await client.query<{status:string}>(
      'select status::text status from live_exam_sessions where id=$1',[sessionId],
    );
    expect(releasedState.rows[0]?.status).toBe('review');

    const released=await client.query(
      'select final_score,score_source::text from live_exam_answers where session_question_id=$1',
      [sessionQuestionId],
    );
    expect(released.rows.every((row)=>Number(row.final_score)===1&&row.score_source==='peer')).toBe(true);
    const learnerReleased=await service.snapshot(student(0),sessionId);
    expect(learnerReleased.ownPointFeedback).toMatchObject({
      status:'available',points:[{code:'M1',matched:true,credited:true}],
    });
    expect(learnerReleased.teacherAnswers).toEqual([]);
    expect(learnerReleased.participants).toEqual([]);
    const anotherLearner=await service.snapshot(student(1),sessionId);
    expect(anotherLearner.ownPointFeedback).toMatchObject({status:'available'});
    expect((learnerReleased.ownAnswer as {text:string}).text).toBe('answer 1');

    const finished=await service.nextQuestion(owner(),sessionId);
    expect(finished.status).toBe('finished');
    const studentReport=await service.snapshot(student(0),sessionId);
    expect(studentReport.report).toMatchObject({
      rows:[{pointFeedback:{status:'available',points:[{code:'M1',credited:true}]}}],
    });
    expect((studentReport.report as {rows:unknown[]}).rows).toHaveLength(1);

    expect(Number((await client.query(
      'select count(*) count from live_exam_learning_evidence where session_id=$1',
      [sessionId],
    )).rows[0].count)).toBe(3);
    expect(Number((await client.query(
      'select count(*) count from mastery where student_id=any($1::uuid[])',
      [studentIds],
    )).rows[0].count)).toBe(3);
  });

  it('avoids recent peer pairs when a different derangement is available', async () => {
    // Keep this acceptance case deterministic even when earlier lifecycle tests
    // created peer reviews for the same reusable fixture students.
    await client.query(
      `update live_exam_reviews r
       set created_at=now()-interval '31 days'
       from live_exam_questions q,live_exam_sessions s
       where q.id=r.session_question_id
         and s.id=q.session_id
         and s.class_id=$1
         and r.kind='peer'`,
      [classId],
    );

    const first=await makeSession({
      code:'820101',
      markingMode:'peer',
      participants:[0,1,2],
    });
    await service.start(owner(),first.sessionId,1);
    await service.revealMarkScheme(owner(),first.sessionId);
    const firstPairs=await client.query<{answer_student:string;reviewer_id:string}>(
      `select p.student_id::text answer_student,r.reviewer_id::text
       from live_exam_reviews r
       join live_exam_answers a on a.id=r.answer_id
       join live_exam_participants p on p.id=a.participant_id
       where r.session_question_id=$1 and r.kind='peer'
       order by p.student_id`,
      [first.sessionQuestionId],
    );
    expect(firstPairs.rowCount).toBe(3);

    const second=await makeSession({
      code:'820102',
      markingMode:'peer',
      participants:[0,1,2],
    });
    await service.start(owner(),second.sessionId,1);
    await service.revealMarkScheme(owner(),second.sessionId);
    const secondPairs=await client.query<{answer_student:string;reviewer_id:string}>(
      `select p.student_id::text answer_student,r.reviewer_id::text
       from live_exam_reviews r
       join live_exam_answers a on a.id=r.answer_id
       join live_exam_participants p on p.id=a.participant_id
       where r.session_question_id=$1 and r.kind='peer'
       order by p.student_id`,
      [second.sessionQuestionId],
    );
    expect(secondPairs.rowCount).toBe(3);
    for(const row of secondPairs.rows){
      const previous=firstPairs.rows.find((item)=>item.answer_student===row.answer_student);
      expect(previous?.reviewer_id).not.toBe(row.reviewer_id);
    }
  });

  it('calibrates peer marking with teacher samples and surfaces score disagreements', async () => {
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'820103',
      markingMode:'peer',
      settings:{peerCalibrationPercent:100,peerDisagreementThreshold:0.5},
      participants:[0,1,2],
    });
    await service.start(owner(),sessionId,1);
    for(let index=0;index<3;index+=1){
      await service.submitAnswer(student(index),sessionId,`calibration answer ${index+1}`);
    }
    await service.revealMarkScheme(owner(),sessionId);

    const reviews=await client.query<{id:string;reviewer_id:string;kind:string}>(
      `select id::text,reviewer_id::text,kind::text
       from live_exam_reviews
       where session_question_id=$1
       order by kind,id`,
      [sessionQuestionId],
    );
    expect(reviews.rows.filter((row)=>row.kind==='peer')).toHaveLength(3);
    expect(reviews.rows.filter((row)=>row.kind==='teacher')).toHaveLength(3);

    for(const review of reviews.rows.filter((row)=>row.kind==='peer')){
      const reviewerIndex=studentIds.indexOf(review.reviewer_id);
      expect(reviewerIndex).toBeGreaterThanOrEqual(0);
      await service.submitReview(student(reviewerIndex),sessionId,review.id,{
        matchedPointIds:[],
        feedback:'Needs the mark point',
      });
    }
    for(const review of reviews.rows.filter((row)=>row.kind==='teacher')){
      const version=Number((await client.query('select version from live_exam_sessions where id=$1',[sessionId])).rows[0].version);
      await service.submitReview(owner(),sessionId,review.id,{
        matchedPointIds:[pointId],
        feedback:'Calibration check',
      },version);
    }

    const state=await client.query<{status:string}>(
      'select status::text status from live_exam_sessions where id=$1',
      [sessionId],
    );
    expect(state.rows[0]?.status).toBe('review');

    const finalScores=await client.query<{score:number;source:string}>(
      `select final_score::float score,score_source::text source
       from live_exam_answers where session_question_id=$1 order by id`,
      [sessionQuestionId],
    );
    expect(finalScores.rows).toHaveLength(3);
    expect(finalScores.rows.every((row)=>Number(row.score)===1&&row.source==='teacher')).toBe(true);

    const snapshot=await service.snapshot(owner(),sessionId);
    const quality=snapshot.peerQualityQueue as Array<{disagreement:number;peerScore:number;teacherScore:number}>|undefined;
    expect(quality).toHaveLength(3);
    expect(quality?.every((row)=>row.peerScore===0&&row.teacherScore===1&&row.disagreement===1)).toBe(true);
  });

  it('builds evidence-backed detailed reports, missed mark points and CSV after finish', async () => {
    const {sessionId,sessionQuestionId}=await makeSession({
      code:'820009',
      markingMode:'teacher',
      participants:[0],
    });
    await service.start(owner(),sessionId,1);
    await service.submitAnswer(student(0),sessionId,'incorrect report answer');
    await service.revealMarkScheme(owner(),sessionId);

    const review=await client.query<{id:string}>(
      'select id::text from live_exam_reviews where session_question_id=$1',
      [sessionQuestionId],
    );
    expect(review.rowCount).toBe(1);
    await service.submitReview(owner(),sessionId,review.rows[0]!.id,{
      matchedPointIds:[],
      feedback:'Needs reteaching',
    });
    const state=await client.query<{status:string;version:number}>(
      'select status::text status,version from live_exam_sessions where id=$1',
      [sessionId],
    );
    expect(state.rows[0]?.status).toBe('review');
    const incorrectSnapshot=await service.snapshot(student(0),sessionId);
    expect(incorrectSnapshot.ownPointFeedback).toMatchObject({
      status:'available',points:[{code:'M1',matched:false,credited:false}],
    });
    await service.nextQuestion(owner(),sessionId,Number(state.rows[0]!.version));

    const report=await service.detailedReport(owner(),sessionId);
    expect(report.aggregate).toMatchObject({
      studentCount:1,
      totalEarned:0,
      totalPossible:1,
      averageScore:0,
      averagePossible:1,
      averagePercentage:0,
    });
    expect(report.students).toHaveLength(1);
    expect(report.questions).toHaveLength(1);
    expect(report.questions[0]).toMatchObject({earned:0,possible:1,percentage:0});
    expect(report.subtopics).toHaveLength(1);
    expect(report.subtopics[0]).toMatchObject({earned:0,possible:1,attempts:1,percentage:0});
    expect(report.mostMissedPoints).toHaveLength(1);
    expect(report.mostMissedPoints[0]).toMatchObject({
      code:'M1',
      assessedCount:1,
      missedCount:1,
      missRate:1,
    });
    expect(report.reteachRecommendations).toHaveLength(1);
    expect(report.reteachRecommendations[0]?.reason).toContain('0/1');

    const csv=await service.detailedReportCsv(owner(),sessionId);
    expect(csv).toContain('Student,Question,Source ref,Subtopics,Score,Possible,Percentage,Score source,Feedback');
    expect(csv).toContain('Acceptance student 1');
    expect(csv).toContain('0.0%');
    expect(csv).toContain('Needs reteaching');

    await expect(service.detailedReport(student(0),sessionId))
      .rejects.toMatchObject({code:'staff_only',status:403});
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
    const releasedState=await client.query<{status:string}>(
      'select status::text status from live_exam_sessions where id=$1',[sessionId],
    );
    expect(releasedState.rows[0]?.status).toBe('review');

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

  it('allows late join only while the question is open and exposes the shared-time fairness policy', async () => {
    const {sessionId}=await makeSession({
      code:'820008',markingMode:'teacher',participants:[0],timeLimit:120,
      settings:{allowLateJoin:false},
    });
    await service.start(owner(),sessionId,1);
    await expect(service.join(student(1),'820008'))
      .rejects.toMatchObject({code:'live_code_not_found'});
    const opened=await service.setLateJoin(owner(),sessionId,true,2);
    expect(opened.allowLateJoin).toBe(true);
    await service.join(student(1),'820008');

    const lateSnapshot=await service.snapshot(student(1),sessionId) as {
      session:{joinedLate:boolean;deadline:Date|null;questionStartedAt:Date|null};
      ownAnswer:{submittedAt:Date|null}|null;
    };
    expect(lateSnapshot.session.joinedLate).toBe(true);
    expect(lateSnapshot.session.deadline).not.toBeNull();
    expect(lateSnapshot.session.questionStartedAt).not.toBeNull();
    expect(lateSnapshot.ownAnswer?.submittedAt).toBeNull();

    await service.revealMarkScheme(owner(),sessionId);
    await expect(service.join(student(2),'820008'))
      .rejects.toMatchObject({code:'live_code_not_found'});
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
    await service.saveAnswer(student(2),sessionId,'The draft already written before timeout.');
    await client.query(
      "update live_exam_sessions set question_started_at=now()-interval '45 seconds' where id=$1",
      [sessionId],
    );

    expect(await service.closeExpired(20)).toBeGreaterThanOrEqual(1);
    expect((await client.query<{status:string}>(
      'select status::text status from live_exam_sessions where id=$1',
      [sessionId],
    )).rows[0]?.status).toBe('marking');
    const submittedDraft=await client.query<{answer_text:string;submitted_at:Date|null}>(
      `select a.answer_text,a.submitted_at from live_exam_answers a
       join live_exam_participants p on p.id=a.participant_id
       where p.session_id=$1 and p.student_id=$2`,
      [sessionId,studentIds[2]],
    );
    expect(submittedDraft.rows[0]?.answer_text).toBe('The draft already written before timeout.');
    expect(submittedDraft.rows[0]?.submitted_at).not.toBeNull();
    expect(await service.closeExpired(20)).toBe(0);
  });

  it('keeps 30- and 60-learner cursor, heartbeat and snapshot bursts inside the classroom budget', async () => {
    const created=await client.query<{id:string}>(
      `insert into users (school_id,role,full_name)
       select $1,'student','Load student '||n::text
       from generate_series(1,60) n
       returning id`,
      [schoolId],
    );
    loadStudentIds.push(...created.rows.map((row)=>row.id));

    const {sessionId,sessionQuestionId}=await makeSession({code:'829960',markingMode:'teacher'});
    await client.query(
      `insert into live_exam_participants(session_id,student_id)
       select $1,student_id
       from unnest($2::uuid[]) student_id`,
      [sessionId,loadStudentIds],
    );
    const assetId='77777777-7777-4777-8777-777777777777';
    const storagePath='supabase://question-assets/load/classroom-visual.png';
    const questionSnapshot={
      leaf:{
        id:questionId,rootId:questionId,label:'1',path:'1',displayRef:'Load Q1',
        stem:'State the output.',stemLatex:null,bodyFormat:'markdown',contentJson:null,
        commandWord:'State',marks:1,answerKind:'text',answerLines:2,
      },
      chain:[{id:questionId,label:'1',depth:0}],
      contextBlocks:[{
        id:questionId,label:'1',displayRef:'Load Q1',depth:0,context:null,contextLatex:null,
        assets:[{
          id:assetId,kind:'image',storagePath,url:null,contentMd:null,
          altText:'Classroom load visual',sortOrder:0,sourcePage:1,
        }],
      }],
      dependencies:[],
      sourceRef:'Load Q1',
    };
    await client.query(
      'update live_exam_questions set question_snapshot=$2::jsonb where id=$1',
      [sessionQuestionId,JSON.stringify(questionSnapshot)],
    );
    await service.start(owner(),sessionId,1);

    let signCalls=0;
    const signer:AssetUrlSigner={
      signStoragePath:async(path)=>{
        expect(path).toBe(storagePath);
        signCalls+=1;
        await new Promise((resolve)=>setTimeout(resolve,10));
        return 'https://assets.example.test/classroom-visual.png';
      },
    };
    const loadService=new LiveExamService(pool,{} as PgQuestionsRepository,signer);
    const realtime=new LiveExamRealtimeService(pool);
    const actors=loadStudentIds.map((id,index):Actor=>({
      id,
      role:'student',
      schoolId,
      fullName:`Load student ${index+1}`,
    }));
    const p95=(values:number[])=>{
      const ordered=[...values].sort((left,right)=>left-right);
      return ordered[Math.max(0,Math.ceil(ordered.length*0.95)-1)]!;
    };
    const runBurst=async(
      size:number,
      label:string,
      operation:(actor:Actor)=>Promise<unknown>,
      p95BudgetMs:number,
    )=>{
      const batchStarted=performance.now();
      const durations=await Promise.all(actors.slice(0,size).map(async(actor)=>{
        const started=performance.now();
        await operation(actor);
        return performance.now()-started;
      }));
      const wallMs=performance.now()-batchStarted;
      const p95Ms=p95(durations);
      const maxMs=Math.max(...durations);
      const qps=size/Math.max(wallMs/1000,0.001);
      console.log(
        `Live classroom ${label} ${size}: p95=${p95Ms.toFixed(1)}ms max=${maxMs.toFixed(1)}ms wall=${wallMs.toFixed(1)}ms qps=${qps.toFixed(1)} poolMax=${pool.options.max}`,
      );
      expect(p95Ms).toBeLessThan(p95BudgetMs);
      expect(maxMs).toBeLessThan(10_000);
      expect(wallMs).toBeLessThan(10_000);
    };

    for(const size of [30,60] as const){
      await runBurst(size,'cursor',async(actor)=>{
        const cursor=await realtime.events(actor,sessionId,0,5);
        expect(cursor.currentVersion).toBeGreaterThanOrEqual(2);
        expect(cursor.changed).toBe(true);
      },3_000);
      await runBurst(size,'heartbeat',async(actor)=>{
        const heartbeat=await loadService.heartbeat(actor,sessionId);
        expect(heartbeat.serverNow).toBeInstanceOf(Date);
      },3_000);
      await runBurst(size,'snapshot',async(actor)=>{
        const snapshot=await loadService.snapshot(actor,sessionId) as {
          session?:{version?:number};
          question?:{portable?:{contextBlocks?:Array<{assets?:Array<{url?:string|null}>}>}};
        };
        expect(snapshot.session?.version).toBeGreaterThanOrEqual(2);
        expect(snapshot.question?.portable?.contextBlocks?.[0]?.assets?.[0]?.url)
          .toBe('https://assets.example.test/classroom-visual.png');
      },5_000);
    }

    // All 90 snapshot calls share the same in-flight/cached signed asset URL.
    expect(signCalls).toBe(1);
    const active=await client.query<{count:number}>(
      `select count(*)::int count
       from live_exam_participants
       where session_id=$1 and left_at is null`,
      [sessionId],
    );
    expect(active.rows[0]?.count).toBe(60);
  },45_000);

});
