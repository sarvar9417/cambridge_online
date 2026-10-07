import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool, type PoolClient } from 'pg';

const describeLive = process.env.LIVE_DB_ACCEPTANCE === '1' ? describe : describe.skip;

describeLive('Live Challenge real PostgreSQL acceptance', () => {
  let pool: Pool;
  let client: PoolClient;
  let ownerId = '';
  let studentA = '';
  let studentB = '';
  let classId = '';
  let questionId = '';
  let sessionA = '';
  let sessionB = '';
  let sessionQuestionA = '';
  let sessionQuestionB = '';
  let participantA = '';
  let participantB = '';
  const pointId = '11111111-1111-4111-8111-111111111111';

  async function rejectedByDatabase(sql: string, params: unknown[], message: string) {
    const savepoint = `sp_${Math.random().toString(36).slice(2, 10)}`;
    await client.query(`SAVEPOINT ${savepoint}`);
    let caught: unknown;
    try {
      await client.query(sql, params);
    } catch (error) {
      caught = error;
    }
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    expect(caught).toBeTruthy();
    expect(caught instanceof Error ? caught.message : String(caught)).toContain(message);
  }

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required for LIVE_DB_ACCEPTANCE');
    pool = new Pool({ connectionString });
    client = await pool.connect();
    await client.query('BEGIN');

    const schoolId = (await client.query<{id:string}>(
      "insert into schools (name) values ('Acceptance school') returning id",
    )).rows[0]!.id;
    ownerId = (await client.query<{id:string}>(
      "insert into users (school_id,role,full_name) values ($1,'owner','Acceptance owner') returning id",
      [schoolId],
    )).rows[0]!.id;
    studentA = (await client.query<{id:string}>(
      "insert into users (school_id,role,full_name) values ($1,'student','Acceptance student A') returning id",
      [schoolId],
    )).rows[0]!.id;
    studentB = (await client.query<{id:string}>(
      "insert into users (school_id,role,full_name) values ($1,'student','Acceptance student B') returning id",
      [schoolId],
    )).rows[0]!.id;
    const syllabusId = (await client.query<{id:string}>(
      "insert into syllabi (code) values ('9618') returning id",
    )).rows[0]!.id;
    classId = (await client.query<{id:string}>(
      "insert into classes (school_id,syllabus_id,owner_id,name) values ($1,$2,$3,'Acceptance class') returning id",
      [schoolId,syllabusId,ownerId],
    )).rows[0]!.id;
    questionId = (await client.query<{id:string}>(
      'insert into questions default values returning id',
    )).rows[0]!.id;

    sessionA = (await client.query<{id:string}>(
      `insert into live_exam_sessions (class_id,host_id,title,join_code,marking_mode)
       values ($1,$2,'Real DB acceptance A','810001','teacher') returning id`,
      [classId,ownerId],
    )).rows[0]!.id;
    sessionB = (await client.query<{id:string}>(
      `insert into live_exam_sessions (class_id,host_id,title,join_code,marking_mode)
       values ($1,$2,'Real DB acceptance B','810002','teacher') returning id`,
      [classId,ownerId],
    )).rows[0]!.id;

    const scheme = { points: [{ id: pointId, code: 'M1', text: 'One mark', marks: 1 }] };
    sessionQuestionA = (await client.query<{id:string}>(
      `insert into live_exam_questions (session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot)
       values ($1,$2,0,1,'{}'::jsonb,$3::jsonb) returning id`,
      [sessionA,questionId,JSON.stringify(scheme)],
    )).rows[0]!.id;
    sessionQuestionB = (await client.query<{id:string}>(
      `insert into live_exam_questions (session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot)
       values ($1,$2,0,1,'{}'::jsonb,$3::jsonb) returning id`,
      [sessionB,questionId,JSON.stringify(scheme)],
    )).rows[0]!.id;

    participantA = (await client.query<{id:string}>(
      'insert into live_exam_participants (session_id,student_id) values ($1,$2) returning id',
      [sessionA,studentA],
    )).rows[0]!.id;
    participantB = (await client.query<{id:string}>(
      'insert into live_exam_participants (session_id,student_id) values ($1,$2) returning id',
      [sessionB,studentB],
    )).rows[0]!.id;
  }, 30_000);

  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    if (pool) await pool.end();
  });

  it('has the production Live hardening objects on a clean migrated database', async () => {
    const result = await client.query<{
      join_code_expires_at:boolean;
      rate_limit_table:boolean;
      event_unique:boolean;
      answer_trigger:boolean;
      review_trigger:boolean;
      point_trigger:boolean;
      join_code_trigger:boolean;
    }>(`
      select
        exists(select 1 from information_schema.columns where table_schema='public' and table_name='live_exam_sessions' and column_name='join_code_expires_at') join_code_expires_at,
        exists(select 1 from information_schema.tables where table_schema='public' and table_name='api_rate_limit_buckets') rate_limit_table,
        exists(select 1 from pg_indexes where schemaname='public' and indexname='live_exam_events_session_version_unique') event_unique,
        exists(select 1 from pg_trigger where tgname='live_exam_answers_integrity' and not tgisinternal) answer_trigger,
        exists(select 1 from pg_trigger where tgname='live_exam_reviews_integrity' and not tgisinternal) review_trigger,
        exists(select 1 from pg_trigger where tgname='live_exam_review_points_integrity' and not tgisinternal) point_trigger,
        exists(select 1 from pg_trigger where tgname='live_exam_join_code_retention' and not tgisinternal) join_code_trigger
    `);
    expect(result.rows[0]).toEqual({
      join_code_expires_at:true,
      rate_limit_table:true,
      event_unique:true,
      answer_trigger:true,
      review_trigger:true,
      point_trigger:true,
      join_code_trigger:true,
    });
  });

  it('rejects cross-session answers at the database boundary', async () => {
    await rejectedByDatabase(
      `insert into live_exam_answers (session_question_id,participant_id,answer_text,word_count)
       values ($1,$2,'cross-session',1)`,
      [sessionQuestionA,participantB],
      'live_answer_session_mismatch',
    );
  });

  it('rejects answer, review and mark-point scores above the immutable question caps', async () => {
    const answerId = (await client.query<{id:string}>(
      `insert into live_exam_answers (session_question_id,participant_id,answer_text,word_count,submitted_at)
       values ($1,$2,'answer',1,now()) returning id`,
      [sessionQuestionA,participantA],
    )).rows[0]!.id;

    await rejectedByDatabase(
      `update live_exam_answers set final_score=2,score_source='teacher' where id=$1`,
      [answerId],
      'live_answer_score_exceeds_marks',
    );

    const reviewId = (await client.query<{id:string}>(
      `insert into live_exam_reviews (session_question_id,answer_id,reviewer_id,kind,status)
       values ($1,$2,$3,'teacher','assigned') returning id`,
      [sessionQuestionA,answerId,ownerId],
    )).rows[0]!.id;

    await rejectedByDatabase(
      `update live_exam_reviews set awarded_marks=2,submitted_at=now() where id=$1`,
      [reviewId],
      'live_review_score_exceeds_marks',
    );

    await rejectedByDatabase(
      `insert into live_exam_review_points (review_id,mark_scheme_point_id,matched,awarded_marks)
       values ($1,$2,true,2)`,
      [reviewId,pointId],
      'live_review_point_score_exceeds_marks',
    );
  });

  it('enforces unique event versions and join-code retention', async () => {
    await client.query(
      `insert into live_exam_events (session_id,actor_id,event_type,session_version)
       values ($1,$2,'acceptance',77)`,
      [sessionA,ownerId],
    );
    await rejectedByDatabase(
      `insert into live_exam_events (session_id,actor_id,event_type,session_version)
       values ($1,$2,'acceptance-duplicate',77)`,
      [sessionA,ownerId],
      'live_exam_events_session_version_unique',
    );

    await client.query(
      `update live_exam_sessions set status='cancelled',finished_at=now(),join_code_expires_at=now()+interval '24 hours' where id=$1`,
      [sessionA],
    );
    await rejectedByDatabase(
      `insert into live_exam_sessions (class_id,host_id,title,join_code,marking_mode)
       values ($1,$2,'Retained code retry','810001','teacher')`,
      [classId,ownerId],
      'live_join_code_retention',
    );
  });

  it('keeps Live trigger functions pinned to a safe search_path', async () => {
    const names = [
      'validate_live_exam_answer_integrity',
      'validate_live_exam_review_integrity',
      'validate_live_exam_review_point_integrity',
      'guard_live_exam_join_code_retention',
      'enforce_live_exam_peer_review_integrity',
      'audit_live_exam_teacher_override',
      'persist_live_exam_learning_evidence',
    ];
    const result = await client.query<{proname:string;proconfig:string[]|null}>(
      `select proname,proconfig from pg_proc join pg_namespace n on n.oid=pronamespace
       where n.nspname='public' and proname=any($1::text[])`,
      [names],
    );
    expect(new Set(result.rows.map((row)=>row.proname)).size).toBe(names.length);
    for (const row of result.rows) {
      expect(row.proconfig ?? []).toContain('search_path=public, pg_temp');
    }
  });

  it('has a writable durable rate-limit bucket for the server role', async () => {
    const key = `acceptance:${Date.now()}`;
    await client.query(
      `insert into api_rate_limit_buckets (bucket_key,request_count,reset_at)
       values ($1,1,now()+interval '1 minute')`,
      [key],
    );
    expect((await client.query<{request_count:number}>(
      'select request_count from api_rate_limit_buckets where bucket_key=$1',
      [key],
    )).rows[0]?.request_count).toBe(1);
  });
});
