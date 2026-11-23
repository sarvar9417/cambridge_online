import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AssessmentCodeService } from '../services/assessment-code-service.js';

const live=process.env.LIVE_DB_ACCEPTANCE==='1';
(live?describe:describe.skip)('PIN-based classroom tests, real PostgreSQL',()=>{
  let client:pg.Client,service:AssessmentCodeService;
  let school:string,otherSchool:string,teacher:string,owner:string,testId:string;
  const actor=(id:string,role:'teacher'|'owner'='teacher',schoolId=school)=>
    ({id,role,schoolId,fullName:'QA teacher'});
  beforeAll(async()=>{
    const dsn=process.env.DATABASE_URL;
    if(!dsn||!['localhost','127.0.0.1','::1'].includes(new URL(dsn).hostname))
      throw Error('PIN test acceptance is restricted to local databases');
    client=new pg.Client({connectionString:dsn,ssl:false});
    await client.connect();
    await client.query('BEGIN');
    service=new AssessmentCodeService({
      query:(sql:string,params?:unknown[])=>client.query(sql,params),
      connect:async()=>({
        release:()=>{},
        query:(sql:string,params?:unknown[])=>{
          if(sql==='BEGIN')return client.query('SAVEPOINT assessment_pin_txn');
          if(sql==='COMMIT')return client.query('RELEASE SAVEPOINT assessment_pin_txn');
          if(sql==='ROLLBACK')return client.query('ROLLBACK TO SAVEPOINT assessment_pin_txn');
          return client.query(sql,params);
        }
      })
    } as unknown as pg.Pool);
    school=(await client.query<{id:string}>(`INSERT INTO schools(name) VALUES ('PIN School') RETURNING id`)).rows[0]!.id;
    otherSchool=(await client.query<{id:string}>(`INSERT INTO schools(name) VALUES ('Other PIN School') RETURNING id`)).rows[0]!.id;
    teacher=(await client.query<{id:string}>(
      `INSERT INTO users(school_id,role,full_name) VALUES($1,'teacher','PIN teacher') RETURNING id`,[school])).rows[0]!.id;
    owner=(await client.query<{id:string}>(
      `INSERT INTO users(school_id,role,full_name) VALUES($1,'owner','PIN owner') RETURNING id`,[school])).rows[0]!.id;
    testId=(await client.query<{id:string}>(
      `INSERT INTO assessment_center_tests(school_id,created_by,title,course_code,grade_label,kind,duration_minutes)
       VALUES($1,$2,'PIN Test','school','Grade 7','practice',20) RETURNING id`,[school,teacher])).rows[0]!.id;
    await client.query(
      `INSERT INTO assessment_center_questions(test_id,position,prompt,options,correct_index,topic,marks)
       VALUES($1,1,'CPU means?', '["Central Processing Unit","Print Unit","Code","None"]'::jsonb,0,'Hardware',1),
       ($1,2,'RAM is?', '["Permanent","Volatile","Optical","ROM"]'::jsonb,1,'Memory',1)`,[testId]);
  });
  afterAll(async()=>{if(client){await client.query('ROLLBACK');await client.end();}});
  it('lets the teacher create a PIN directly from an unpublished draft',async()=>{
    await expect(service.create(actor(teacher),testId,false))
      .rejects.toMatchObject({code:'test_source_review_required'});
    const s=await service.create(actor(teacher),testId,true);
    expect(s.code).toMatch(/^\d{6}$/);
    expect((await service.lobby(s.code))).toMatchObject({title:'PIN Test',questionCount:2,durationMinutes:20});
    expect((await service.list(actor(owner,'owner'))).some(x=>x.code===s.code)).toBe(true);
    await expect(service.report(actor(teacher,'teacher',otherSchool),s.id))
      .rejects.toMatchObject({status:404});
    const guest=await service.join(s.code,'Ali Valiyev');
    expect(guest.token).toMatch(/^[0-9a-f]{64}$/);
    await expect(service.join(s.code,'ALI VALIYEV'))
      .rejects.toMatchObject({code:'test_name_taken',status:409});
    await expect(service.snapshot(guest.playerId,'f'.repeat(64)))
      .rejects.toMatchObject({status:403});
    const first=await service.snapshot(guest.playerId,guest.token);
    expect(first.questions).toHaveLength(2);
    expect(first.questions[0]).not.toHaveProperty('correctIndex');
    await service.answer(guest.playerId,guest.token,first.questions[0]!.id,0);
    await service.answer(guest.playerId,guest.token,first.questions[1]!.id,2);
    const done=await service.submit(guest.playerId,guest.token);
    expect(done).toMatchObject({score:1,maxScore:2});
    expect(done.questions[0]).not.toHaveProperty('correctIndex');
    await expect(service.answer(guest.playerId,guest.token,first.questions[1]!.id,1))
      .rejects.toMatchObject({status:409});
    expect((await service.submit(guest.playerId,guest.token)).score).toBe(1);
    const teacherReport=await service.report(actor(teacher),s.id);
    expect(teacherReport.students).toHaveLength(1);
    expect(teacherReport.students[0]).toMatchObject({name:'Ali Valiyev',score:1,maxScore:2});
    expect(teacherReport.students[0]!.details.map(x=>x.correct)).toEqual([true,false]);
    await service.close(actor(teacher),s.id);
    await expect(service.join(s.code,'Zarina Karimova'))
      .rejects.toMatchObject({status:404});
    expect((await service.report(actor(teacher),s.id)).students[0]!.score).toBe(1);
  });
  it('automatically finalizes an expired timer and reports unanswered questions',async()=>{
    const s=await service.create(actor(teacher),testId,true);
    const g=await service.join(s.code,'Zarina Karimova');
    await client.query(`UPDATE assessment_code_players SET deadline_at=now()-interval '5 seconds'
                        WHERE id=$1`,[g.playerId]);
    const done=await service.snapshot(g.playerId,g.token);
    expect(done).toMatchObject({score:0,maxScore:2});
    await expect(service.answer(g.playerId,g.token,done.questions[0]!.id,0))
      .rejects.toMatchObject({status:409});
  });
  it('closing a room grades work in progress and retains historical results',async()=>{
    const s=await service.create(actor(teacher),testId,true);
    const g=await service.join(s.code,'Malika');
    const state=await service.snapshot(g.playerId,g.token);
    await service.answer(g.playerId,g.token,state.questions[0]!.id,0);
    await service.close(actor(teacher),s.id);
    expect((await service.snapshot(g.playerId,g.token)).score).toBe(1);
    expect((await service.report(actor(owner,'owner'),s.id)).students[0]!.score).toBe(1);
  });
});

