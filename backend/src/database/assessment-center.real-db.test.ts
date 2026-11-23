import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import pg from 'pg';
import {AssessmentCenterService} from '../services/assessment-center-service.js';

const enabled=process.env.LIVE_DB_ACCEPTANCE==='1';
const describeReal=enabled?describe:describe.skip;

describeReal('Assessment Center real PostgreSQL — deadlines, isolation and immutable grading',()=>{
  let client:pg.Client;
  let service:AssessmentCenterService;
  let school:string,teacher:string,student:string,otherStudent:string,klass:string,wrongClass:string;
  const actor=(id:string,role:'teacher'|'student')=>({id,role,schoolId:school,fullName:'Assessment user'});

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
    student=(await client.query<{id:string}>(
      `insert into users(school_id,role,full_name) values($1,'student','Learner One') returning id`,[school])).rows[0]!.id;
    otherStudent=(await client.query<{id:string}>(
      `insert into users(school_id,role,full_name) values($1,'student','Learner Two') returning id`,[school])).rows[0]!.id;
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
  it('server finalizes abandoned expired attempts even if browser never submits',async()=>{
    const draft=await create();
    await service.publish(actor(teacher,'teacher'),draft.id,[klass],false,true);
    const first=await service.start(actor(student,'student'),draft.id);
    await service.saveAnswer(actor(student,'student'),first.id,first.questions[1]!.id,1);
    await client.query(`update assessment_center_attempts
      set deadline_at=now()-interval '10 seconds' where id=$1`,[first.id]);
    const list=await service.list(actor(student,'student'));
    expect(list.find(row=>row.id===draft.id)?.submittedAt).not.toBeNull();
    const report=await service.report(actor(teacher,'teacher'),draft.id);
    expect(report.students.find(row=>row.studentId===student)?.score).toBe(1);
    const stored=await client.query<{submitted_at:Date;deadline_at:Date}>(
      `select submitted_at,deadline_at from assessment_center_attempts where id=$1`,[first.id]);
    expect(+stored.rows[0]!.submitted_at).toBe(+stored.rows[0]!.deadline_at);
  });
});
