import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { LiveQuizService } from '../services/live-quiz-service.js';

const enabled=process.env.LIVE_DB_ACCEPTANCE==='1';
const describeDb=enabled?describe:describe.skip;

describeDb('Live Quiz classroom links — real PostgreSQL isolation',()=>{
  let client:pg.Client;
  beforeAll(async()=>{
    const url=process.env.DATABASE_URL;
    if(!url||!['127.0.0.1','localhost','::1'].includes(new URL(url).hostname))
      throw new Error('Classroom discovery real-DB test is localhost-only');
    client=new pg.Client({connectionString:url,ssl:false});
    await client.connect();
    await client.query('BEGIN');
  });
  afterAll(async()=>{if(client){await client.query('ROLLBACK');await client.end();}});

  it('only shows the teacher-selected class and respects late joining and expiry',async()=>{
    const school=await client.query<{id:string}>(`insert into schools(name) values('Quiz school') returning id`);
    const schoolId=school.rows[0]!.id;
    const teacher=await client.query<{id:string}>(
      `insert into users(school_id,role,full_name) values($1,'teacher','Quiz Teacher') returning id`,[schoolId]);
    const student=await client.query<{id:string}>(
      `insert into users(school_id,role,full_name) values($1,'student','Quiz Student') returning id`,[schoolId]);
    const syllabus=await client.query<{id:string}>(`insert into syllabi(code) values('9618') returning id`);
    const klass=await client.query<{id:string}>(
      `insert into classes(school_id,syllabus_id,owner_id,name) values($1,$2,$3,'11-A') returning id`,
      [schoolId,syllabus.rows[0]!.id,teacher.rows[0]!.id]);
    const otherClass=await client.query<{id:string}>(
      `insert into classes(school_id,syllabus_id,owner_id,name) values($1,$2,$3,'11-B') returning id`,
      [schoolId,syllabus.rows[0]!.id,teacher.rows[0]!.id]);
    await client.query(`insert into enrollments(class_id,student_id) values($1,$2)`,
      [klass.rows[0]!.id,student.rows[0]!.id]);
    const questions=JSON.stringify([{}, {}, {}, {}]);
    const createRoom=async(classId:string,pin:string)=>{
      const result=await client.query<{id:string}>(
        `insert into live_quiz_rooms(host_id,class_id,pin,course_code,scopes,questions,question_seconds,allow_late_join)
         values($1,$2,$3,'9618','[]'::jsonb,$4::jsonb,20,true) returning id`,
        [teacher.rows[0]!.id,classId,pin,questions]);
      return result.rows[0]!.id;
    };
    const roomId=await createRoom(klass.rows[0]!.id,'893411');
    await createRoom(otherClass.rows[0]!.id,'893412');
    const service=new LiveQuizService(client as unknown as pg.Pool);
    const actor={id:student.rows[0]!.id,role:'student' as const,schoolId,fullName:'Quiz Student'};
    expect((await service.availableForStudent(actor)).map(room=>room.pin)).toEqual(['893411']);

    await client.query(`update live_quiz_rooms set status='active',allow_late_join=false where id=$1`,[roomId]);
    expect(await service.availableForStudent(actor)).toEqual([]);
    await client.query(`update live_quiz_rooms set allow_late_join=true,status='review' where id=$1`,[roomId]);
    expect((await service.availableForStudent(actor)).map(room=>room.pin)).toEqual(['893411']);
    await client.query(`update enrollments set left_at=now() where class_id=$1`,[klass.rows[0]!.id]);
    expect(await service.availableForStudent(actor)).toEqual([]);
  });
});
