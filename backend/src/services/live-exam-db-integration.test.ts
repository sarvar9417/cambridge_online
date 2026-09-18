import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import { LiveExamControlService } from './live-exam-control-service.js';
import { LiveExamModerationService } from './live-exam-moderation-service.js';
import { LiveExamParticipationService } from './live-exam-participation-service.js';
import { LiveExamService } from './live-exam-service.js';

const integrationDescribe = process.env.LIVE_EXAM_DB_INTEGRATION === '1' ? describe : describe.skip;
const DATABASE_URL = process.env.DATABASE_URL ?? '';

const teacher:Actor={
  id:'66666666-6666-4666-8666-666666666666',
  role:'teacher',
  schoolId:'school',
  fullName:'Teacher',
};
const studentA:Actor={
  id:'77777777-7777-4777-8777-777777777777',
  role:'student',
  schoolId:'school',
  fullName:'Student A',
};
const studentB:Actor={
  id:'99999999-9999-4999-8999-999999999999',
  role:'student',
  schoolId:'school',
  fullName:'Student B',
};

const SESSION='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const SESSION_QUESTION='ffffffff-ffff-4fff-8fff-ffffffffffff';
const POINT_1='12121212-1212-4121-8121-121212121212';
const POINT_2='13131313-1313-4131-8131-131313131313';

integrationDescribe('Live Challenge multi-client PostgreSQL integration',()=>{
  const pool=new Pool({connectionString:DATABASE_URL});
  const control=new LiveExamControlService(pool);
  const participation=new LiveExamParticipationService(pool);
  const moderation=new LiveExamModerationService(pool);
  const runtime=new LiveExamService(pool,{} as PgQuestionsRepository);

  beforeAll(async()=>{
    await pool.query(`delete from live_exam_sessions where id=$1`,[SESSION]);
    const scheme={
      id:'14141414-1414-4141-8141-141414141414',
      schemeType:'all_required',
      maxMarks:2,
      guidanceMd:null,
      points:[
        {id:POINT_1,code:'MP1',text:'First mark point',marks:1,accept:null,reject:null,requires:[],isBod:false,groupId:null},
        {id:POINT_2,code:'MP2',text:'Second mark point',marks:1,accept:null,reject:null,requires:[],isBod:false,groupId:null},
      ],
      groups:[],
    };
    await pool.query(
      `insert into live_exam_sessions(
         id,class_id,host_id,title,join_code,status,marking_mode,settings
       ) values($1,$2,$3,'Service integration','654321','published','peer',$4::jsonb)`,
      [
        SESSION,
        '55555555-5555-4555-8555-555555555555',
        teacher.id,
        JSON.stringify({allowLateJoin:true}),
      ],
    );
    await pool.query(
      `insert into live_exam_questions(
         id,session_id,question_id,position,marks,question_snapshot,mark_scheme_snapshot
       ) values($1,$2,$3,0,2,$4::jsonb,$5::jsonb)`,
      [
        SESSION_QUESTION,
        SESSION,
        '88888888-8888-4888-8888-888888888888',
        JSON.stringify({sourceRef:'9618/11/M/J/25 Q1'}),
        JSON.stringify(scheme),
      ],
    );
  });

  afterAll(async()=>{
    await pool.query(`delete from live_exam_sessions where id=$1`,[SESSION]);
    await pool.end();
  });

  it('runs teacher + two students through the authoritative lifecycle',async()=>{
    let version=1;

    const opened=await control.openRoom(teacher,SESSION,version);
    expect(opened.status).toBe('lobby');
    version=opened.version;

    const joinedA=await participation.join(studentA,'654321');
    expect(joinedA.reused).toBe(false);
    version=joinedA.version!;
    const joinedB=await participation.join(studentB,'654321');
    expect(joinedB.reused).toBe(false);
    version=joinedB.version!;

    const started=await control.start(teacher,SESSION,version);
    expect(started.status).toBe('question_open');
    version=started.version;

    await expect(control.pause(teacher,SESSION,version-1))
      .rejects.toMatchObject({code:'live_state_conflict',status:409});

    const paused=await control.pause(teacher,SESSION,version);
    expect(paused.status).toBe('paused');
    version=paused.version;
    const resumed=await control.resume(teacher,SESSION,version);
    expect(resumed.status).toBe('question_open');
    version=resumed.version;

    const submittedA=await runtime.submitAnswer(studentA,SESSION,'Student A answer');
    version=submittedA.version;
    const submittedB=await runtime.submitAnswer(studentB,SESSION,'Student B answer');
    version=submittedB.version;

    const locked=await control.lockAnswers(teacher,SESSION,version);
    expect(locked.status).toBe('answers_locked');
    version=locked.version;
    await expect(runtime.submitAnswer(studentA,SESSION,'late mutation'))
      .rejects.toMatchObject({code:'live_answer_locked',status:409});

    const revealed=await control.revealMarkScheme(teacher,SESSION,version);
    expect(revealed.status).toBe('marking');
    version=revealed.version;

    const reviewRows=await pool.query(
      `select r.id,r.reviewer_id,owner.student_id answer_owner
       from live_exam_reviews r
       join live_exam_answers a on a.id=r.answer_id
       join live_exam_participants owner on owner.id=a.participant_id
       where r.session_question_id=$1
       order by r.id`,
      [SESSION_QUESTION],
    );
    expect(reviewRows.rowCount).toBe(2);
    expect(reviewRows.rows.every(row=>String(row.reviewer_id)!==String(row.answer_owner))).toBe(true);
    expect(new Set(reviewRows.rows.map(row=>String(row.reviewer_id)))).toEqual(new Set([studentA.id,studentB.id]));

    for(const row of reviewRows.rows){
      const reviewer=String(row.reviewer_id)===studentA.id?studentA:studentB;
      const result=await runtime.submitReview(reviewer,SESSION,String(row.id),{
        matchedPointIds:[POINT_1,POINT_2],
        feedback:'Peer checked against the revealed Mark Scheme.',
      });
      expect(result.score).toBe(2);
      version=result.version;
    }

    const reviewed=await control.completeMarking(teacher,SESSION,version);
    expect(reviewed.status).toBe('review');
    version=reviewed.version;

    const firstAnswer=await pool.query(
      `select a.id
       from live_exam_answers a
       join live_exam_participants p on p.id=a.participant_id
       where a.session_question_id=$1 and p.student_id=$2`,
      [SESSION_QUESTION,studentA.id],
    );
    const moderated=await moderation.moderate(teacher,SESSION,String(firstAnswer.rows[0].id),{
      score:1,
      feedback:'Teacher correction',
      reason:'Corrected against canonical Mark Scheme.',
      expectedVersion:version,
    });
    expect(moderated.reason).toBe('Corrected against canonical Mark Scheme.');
    version=moderated.version;

    const finished=await control.nextQuestion(teacher,SESSION,version);
    expect(finished.status).toBe('finished');
    version=finished.version;

    const session=await pool.query(`select status::text,version from live_exam_sessions where id=$1`,[SESSION]);
    expect(session.rows[0]).toMatchObject({status:'finished'});
    expect(Number(session.rows[0].version)).toBe(version);

    const evidence=await pool.query(
      `select student_id,marks_earned,marks_possible,teacher_overridden
       from live_exam_learning_evidence where session_id=$1 order by student_id`,
      [SESSION],
    );
    expect(evidence.rowCount).toBe(2);
    expect(evidence.rows.map(row=>Number(row.marks_possible))).toEqual([2,2]);
    const aEvidence=evidence.rows.find(row=>String(row.student_id)===studentA.id);
    const bEvidence=evidence.rows.find(row=>String(row.student_id)===studentB.id);
    expect(Number(aEvidence?.marks_earned)).toBe(1);
    expect(aEvidence?.teacher_overridden).toBe(true);
    expect(Number(bEvidence?.marks_earned)).toBe(2);
    expect(bEvidence?.teacher_overridden).toBe(false);

    const audit=await pool.query(
      `select reason,new_score from live_exam_score_overrides
       where session_id=$1 order by created_at desc limit 1`,
      [SESSION],
    );
    expect(audit.rows[0]).toMatchObject({reason:'Corrected against canonical Mark Scheme.'});
    expect(Number(audit.rows[0].new_score)).toBe(1);

    const versions=await pool.query(
      `select count(*)::int event_count,count(distinct session_version)::int distinct_versions,
              max(session_version)::bigint max_version
       from live_exam_events where session_id=$1`,
      [SESSION],
    );
    expect(versions.rows[0].event_count).toBe(versions.rows[0].distinct_versions);
    expect(Number(versions.rows[0].max_version)).toBe(version);
  });
});
