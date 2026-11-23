import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import pg from 'pg';
import {AssessmentCenterService} from '../services/assessment-center-service.js';

const enabled=process.env.LIVE_DB_ACCEPTANCE==='1';
const describeReal=enabled?describe:describe.skip;

describeReal('Assessment Center real PostgreSQL — deadlines, isolation and immutable grading',()=>{
  let client:pg.Client;
  let service:AssessmentCenterService;
  let school:string,teacher:string,owner:string,student:string,otherStudent:string,unassignedStudent:string,klass:string,wrongClass:string;
  const actor=(id:string,role:'owner'|'teacher'|'student')=>({id,role,schoolId:school,fullName:'Assessment user'});

  beforeAll(async()=>{
    const raw=process.env.DATABASE_URL;
    if(!raw||!['localhost','127.0.0.1','::1'].includes(new URL(raw).hostname))
      throw Error('Assessment DB acceptance is restricted to localhost');
    client=new pg.Client({connectionString:raw,ssl:false});
    await client.connect();await client.query('BEGIN');
    const clientAdapter={
      query:(sql:string,values?:unknown[])=>client.query(sql,values),
      release:()=>{},
    };
    service=new AssessmentCenterService({
      query:(sql:string,values?:unknown[])=>client.query(sql,values),
      connect:async()=>({
        ...clientAdapter,
        query:(sql:string,values?:unknown[])=>{
          if(sql==='BEGIN')return client.query('SAVEPOINT assessment_transaction');
          if(sql==='COMMIT')return client.query('RELEASE SAVEPOINT assessment_transaction');
          if(sql==='ROLLBACK')return client.query('ROLLBACK TO SAVEPOINT assessment_transaction');
          return client.query(sql,values);
        },
      }),
    } as unknown as pg.Pool);
    school=(await client.query<{id:string}>(`insert into schools(name) values('Assessment QA School') returning id`)).rows[0]!.id;
    teacher=(await client.query<{id:string}>(
      `insert into users(school_id,role,full_name) values($1,'teacher','Assessment Teacher') returning id`,[school])).rows[0]!.id;
    owner=(await client.query<{id:string}>(
      `insert into users(school_id,role,full_name) values($1,'owner','Assessment Owner') returning id`,[school])).rows[0]!.id;
    student=(await client.query<{id:string}>(
      `insert into users(school_id,role,full_name) values($1,'student','Learner One') returning id`,[school])).rows[0]!.id;
    otherStudent=(await client.query<{id:string}>(
      `insert into users(school_id,role,full_name) values($1,'student','Learner Two') returning id`,[school])).rows[0]!.id;
    unassignedStudent=(await client.query<{id:string}>(
      `insert into users(school_id,role,full_name) values($1,'student','Unassigned Learner') returning id`,[school])).rows[0]!.id;
    const c9618=(await client.query<{id:string}>(`insert into syllabi(code) values('9618') returning id`)).rows[0]!.id;
    const c0478=(await client.query<{id:string}>(`insert into syllabi(code) values('0478') returning id`)).rows[0]!.id;
    klass=(await client.query<{id:string}>(
      `insert into classes(school_id,syllabus_id,owner_id,name,grade)
       values($1,$2,$3,'11-A Assessment',11) returning id`,[school,c9618,teacher])).rows[0]!.id;
    wrongClass=(await client.query<{id:string}>(
      `insert into classes(school_id,syllabus_id,owner_id,name,grade)
       values($1,$2,$3,'IGCSE Assessment',10) returning id`,[school,c0478,teacher])).rows[0]!.id;
    await client.query(`insert into enrollments(class_id,student_id) values($1,$2)`,[klass,student]);
    await client.query(`insert into enrollments(class_id,student_id) values($1,$2)`,[wrongClass,otherStudent]);
  });
  afterAll(async()=>{if(client){await client.query('ROLLBACK');await client.end();}});
  const create=async()=>service.create(actor(teacher,'teacher'),{
    title:'A Level diagnostic QA',courseCode:'9618',gradeLabel:'Paper 1',
    kind:'diagnostic',durationMinutes:20,
    questions:[
      {prompt:'CPU means?',options:['Central Processing Unit','Central Print Unit','CPU','None'],
       correctIndex:0,topic:'Processor',maxMarks:1},
      {prompt:'What is RAM?',options:['Permanent','Volatile','Optical','Read-only'],
       correctIndex:1,topic:'Memory',maxMarks:1},
    ],
  });

  it('blocks wrong course publication and protects draft test from students',async()=>{
    const draft=await create();
    expect((await service.list(actor(student,'student'))).some(t=>t.id===draft.id)).toBe(false);
    await expect(service.publish(actor(teacher,'teacher'),draft.id,[wrongClass],false,true))
      .rejects.toMatchObject({code:'test_class_course_mismatch',status:409});
    const receipt=await service.publish(actor(teacher,'teacher'),draft.id,[klass],false,true);
    expect(receipt).toMatchObject({status:'published',classes:1});
    expect((await service.list(actor(student,'student'))).some(t=>t.id===draft.id)).toBe(true);
    expect((await service.list(actor(otherStudent,'student'))).some(t=>t.id===draft.id)).toBe(false);
    await expect(service.updateQuestion(actor(teacher,'teacher'),draft.id,'00000000-0000-4000-8000-000000000001',
      {correctIndex:2})).rejects.toMatchObject({code:'test_already_published',status:409});
  });
  it('accepts a student answer, hides key, marks once, and reports by topic',async()=>{
    const draft=await create();
    await service.publish(actor(teacher,'teacher'),draft.id,[klass],false,true);
    const first=await service.start(actor(student,'student'),draft.id);
    expect(first.questions).toHaveLength(2);
    expect(first.questions[0]).not.toHaveProperty('correctIndex');
    await expect(service.start(actor(otherStudent,'student'),draft.id))
      .rejects.toMatchObject({code:'test_not_found',status:404});
    await service.saveAnswer(actor(student,'student'),first.id,first.questions[0]!.id,0);
    await service.saveAnswer(actor(student,'student'),first.id,first.questions[1]!.id,2);
    const marked=await service.submit(actor(student,'student'),first.id);
    expect(marked).toMatchObject({score:1,maxScore:2});
    expect(marked.questions[0]).not.toHaveProperty('correctIndex');
    await expect(service.saveAnswer(actor(student,'student'),first.id,first.questions[0]!.id,1))
      .rejects.toMatchObject({code:'test_time_expired',status:409});
    const repeat=await service.submit(actor(student,'student'),first.id);
    expect(repeat.score).toBe(1);
    const report=await service.report(actor(teacher,'teacher'),draft.id);
    expect(report.students.some(r=>r.studentId===student&&r.percent===50)).toBe(true);
    expect(report.topics.map(t=>t.topic)).toEqual(['Memory','Processor']);
    expect(report.questions.find(q=>q.number===1)?.correct).toBe(1);
    expect((await service.profile(actor(student,'student'),student)).tests.some(t=>t.testId===draft.id)).toBe(true);
  });
  it('delivers directly to an unassigned student with scheduled opening, closing and stable shuffled order',async()=>{
    const draft=await service.create(actor(owner,'owner'),{
      title:'Grade 8 direct diagnostic',courseCode:'school',gradeLabel:'Grade 8',
      kind:'diagnostic',durationMinutes:15,shuffleQuestions:true,
      opensAt:new Date(Date.now()+60_000).toISOString(),
      closesAt:new Date(Date.now()+15*60_000).toISOString(),
      questions:[
        {prompt:'What is binary?',options:['A system of base 2','Base 10','Base 16','Base 8'],
          correctIndex:0,topic:'Representation',maxMarks:1},
        {prompt:'Which device is input?',options:['Monitor','Mouse','Printer','Speaker'],
          correctIndex:1,topic:'Devices',maxMarks:1},
      ],
    });
    await service.publish(actor(owner,'owner'),draft.id,[],false,true,[unassignedStudent]);
    expect((await service.list(actor(unassignedStudent,'student'))).some(t=>t.id===draft.id)).toBe(true);
    expect((await service.list(actor(student,'student'))).some(t=>t.id===draft.id)).toBe(false);
    await expect(service.start(actor(unassignedStudent,'student'),draft.id))
      .rejects.toMatchObject({code:'test_not_open',status:409});
    await client.query(
      `update assessment_center_tests set opens_at=now()-interval '2 minutes' where id=$1`,
      [draft.id]);
    const attempt=await service.start(actor(unassignedStudent,'student'),draft.id);
    const again=await service.attempt(actor(unassignedStudent,'student'),attempt.id);
    expect(attempt.questions.map(q=>q.id)).toEqual(again.questions.map(q=>q.id));
    expect(attempt.questions.every(q=>!('correctIndex' in q))).toBe(true);
    const report=await service.report(actor(owner,'owner'),draft.id);
    expect(report.students.map(item=>item.studentId)).toContain(unassignedStudent);
    await service.saveAnswer(actor(unassignedStudent,'student'),attempt.id,attempt.questions[0]!.id,0);
    const submitted=await service.submit(actor(unassignedStudent,'student'),attempt.id);
    expect(submitted.maxScore).toBe(2);
    expect((await service.profile(actor(owner,'owner'),unassignedStudent)).tests)
      .toEqual(expect.arrayContaining([expect.objectContaining({testId:draft.id})]));
  });
  it('refuses direct Grade 8 assignment to a student already enrolled in Grade 10/11',async()=>{
    const draft=await service.create(actor(owner,'owner'),{
      title:'Grade 8 mismatch',courseCode:'school',gradeLabel:'Grade 8',
      kind:'practice',durationMinutes:10,
      questions:[{prompt:'What is binary?',options:['Base 2','Base 8','Base 10','Base 16'],
        correctIndex:0,topic:'Data representation',maxMarks:1}],
    });
    await expect(service.publish(actor(owner,'owner'),draft.id,[],false,true,[student]))
      .rejects.toMatchObject({code:'test_student_course_mismatch',status:409});
  });
  it('cannot hand a teacher-owned test to an unassigned student outside the teacher roster',async()=>{
    const draft=await create();
    await expect(service.publish(actor(teacher,'teacher'),draft.id,[],false,true,[unassignedStudent]))
      .rejects.toMatchObject({code:'test_student_forbidden',status:403});
  });
  it('cannot start a closed scheduled test even if explicitly invited',async()=>{
    const draft=await service.create(actor(owner,'owner'),{
      title:'Closed Grade 9 test',courseCode:'school',gradeLabel:'Grade 9',
      kind:'diagnostic',durationMinutes:5,
      closesAt:new Date(Date.now()+60_000).toISOString(),
      questions:[{prompt:'What is data?',options:['Raw facts','RAM','CPU','ROM'],
        correctIndex:0,topic:'Data',maxMarks:1}],
    });
    await service.publish(actor(owner,'owner'),draft.id,[],false,true,[unassignedStudent]);
    await client.query(
      `update assessment_center_tests set closes_at=now()-interval '1 second' where id=$1`,
      [draft.id]);
    await expect(service.start(actor(unassignedStudent,'student'),draft.id))
      .rejects.toMatchObject({code:'test_closed',status:409});
  });
  it('archives after submitted attempts, preserves result history, then releases the key',async()=>{
    const draft=await create();
    await service.publish(actor(teacher,'teacher'),draft.id,[klass],false,true);
    const attempt=await service.start(actor(student,'student'),draft.id);
    await service.saveAnswer(actor(student,'student'),attempt.id,attempt.questions[0]!.id,0);
    await expect(service.archive(actor(teacher,'teacher'),draft.id))
      .rejects.toMatchObject({code:'test_in_progress',status:409});
    await service.submit(actor(student,'student'),attempt.id);
    await service.archive(actor(teacher,'teacher'),draft.id);
    await expect(service.start(actor(otherStudent,'student'),draft.id))
      .rejects.toMatchObject({code:'test_not_found',status:404});
    const old=await service.start(actor(student,'student'),draft.id);
    expect(old.score).toBe(1);
    expect(old.questions[0]).not.toHaveProperty('correctIndex');
    const released=await service.releaseAnswers(actor(teacher,'teacher'),draft.id);
    expect(released.released).toBe(true);
    const review=await service.attempt(actor(student,'student'),attempt.id);
    expect(review.questions[0]).toHaveProperty('correctIndex',0);
    const list=await service.list(actor(student,'student'));
    const historical=list.find(item=>item.id===draft.id);
    expect(historical&&'submittedAt' in historical?historical.submittedAt:null).not.toBeNull();
    const report=await service.report(actor(teacher,'teacher'),draft.id);
    expect(report.students.find(item=>item.studentId===student)?.score).toBe(1);
  });
  it('never releases monitoring keys before archived and only hard-deletes unpublished drafts',async()=>{
    const draft=await create();
    await expect(service.releaseAnswers(actor(teacher,'teacher'),draft.id))
      .rejects.toMatchObject({code:'test_must_be_archived',status:409});
    await expect(service.publish(actor(teacher,'teacher'),draft.id,[klass],true,true))
      .rejects.toMatchObject({code:'answer_release_requires_archive',status:409});
    const deleted=await service.deleteDraft(actor(teacher,'teacher'),draft.id);
    expect(deleted.deleted).toBe(true);
    const publishable=await create();
    await service.publish(actor(teacher,'teacher'),publishable.id,[klass],false,true);
    await expect(service.deleteDraft(actor(teacher,'teacher'),publishable.id))
      .rejects.toMatchObject({code:'published_test_immutable',status:409});
  });
  it('server finalizes abandoned expired attempts even if browser never submits',async()=>{
    const draft=await create();
    await service.publish(actor(teacher,'teacher'),draft.id,[klass],false,true);
    const first=await service.start(actor(student,'student'),draft.id);
    await service.saveAnswer(actor(student,'student'),first.id,first.questions[1]!.id,1);
    await client.query(`update assessment_center_attempts
      set deadline_at=now()-interval '10 seconds' where id=$1`,[first.id]);
    const list=await service.list(actor(student,'student'));
    const result=list.find(row=>row.id===draft.id);
    expect(result && 'submittedAt' in result ? result.submittedAt : null).not.toBeNull();
    const report=await service.report(actor(teacher,'teacher'),draft.id);
    expect(report.students.find(row=>row.studentId===student)?.score).toBe(1);
    const stored=await client.query<{submitted_at:Date;deadline_at:Date}>(
      `select submitted_at,deadline_at from assessment_center_attempts where id=$1`,[first.id]);
    expect(+stored.rows[0]!.submitted_at).toBe(+stored.rows[0]!.deadline_at);
  });
});
