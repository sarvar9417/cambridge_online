import { afterAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import { LiveExamBuilderService } from './live-exam-builder-service.js';
import { LiveExamControlService } from './live-exam-control-service.js';
import { LiveExamModerationService } from './live-exam-moderation-service.js';
import { LiveExamParticipationService } from './live-exam-participation-service.js';
import { LiveExamService } from './live-exam-service.js';
import { projectLiveExamForBoard } from './live-exam-board-projection.js';

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

const CLASS='55555555-5555-4555-8555-555555555555';
const SYLLABUS='11111111-1111-4111-8111-111111111111';
const TOPIC='22222222-2222-4222-8222-222222222222';
const SUBTOPIC='33333333-3333-4333-8333-333333333333';
const QUESTION='88888888-8888-4888-8888-888888888888';
const POINT_1='12121212-1212-4121-8121-121212121212';
const POINT_2='13131313-1313-4131-8131-131313131313';

integrationDescribe('Live Challenge multi-client PostgreSQL integration',()=>{
  const pool=new Pool({connectionString:DATABASE_URL});
  let sessionId:string|null=null;

  const questionRepository={
    portable:async(_actor:Actor,id:string)=>id===QUESTION?{
      sourceRef:'9618/11/M/J/25 Q1',
      leaf:{
        id:'15151515-1515-4151-8151-151515151515',
        rootId:'15151515-1515-4151-8151-151515151515',
        label:'1',
        path:'1',
        displayRef:'9618/11/M/J/25 Q1',
        stem:'State two valid points.',
        stemLatex:null,
        bodyFormat:'markdown',
        contentJson:null,
        commandWord:'State',
        marks:2,
        answerKind:'text',
        answerLines:2,
      },
      chain:[],
      dependencies:[],
      contextBlocks:[],
    }:null,
  } as unknown as PgQuestionsRepository;

  const builder=new LiveExamBuilderService(pool,questionRepository);
  const control=new LiveExamControlService(pool);
  const participation=new LiveExamParticipationService(pool);
  const moderation=new LiveExamModerationService(pool);
  const runtime=new LiveExamService(pool,questionRepository);

  afterAll(async()=>{
    if(sessionId)await pool.query(`delete from live_exam_sessions where id=$1`,[sessionId]);
    await pool.end();
  });

  it('runs builder + teacher + board + two students through the authoritative lifecycle',async()=>{
    const draft=await builder.createDraft(teacher,{
      classId:CLASS,
      title:'Service integration',
      topicId:TOPIC,
      subtopicId:SUBTOPIC,
      markingMode:'peer',
      settings:{allowLateJoin:true},
    });
    sessionId=draft.id;
    let version=draft.version;
    expect(draft.status).toBe('draft');

    const candidates=await builder.eligibleQuestions(teacher,{
      syllabusId:SYLLABUS,
      topicId:TOPIC,
      subtopicId:SUBTOPIC,
      limit:10,
    });
    expect(candidates.map(candidate=>candidate.id)).toContain(QUESTION);

    const selected=await builder.replaceQuestions(teacher,sessionId,[QUESTION],version);
    expect(selected.questionCount).toBe(1);
    version=selected.version;

    const published=await builder.publish(teacher,sessionId,version);
    expect(published.status).toBe('published');
    expect(published.joinCode).toMatch(/^\d{6}$/);
    version=published.version;

    const questionRow=await pool.query(
      `select id from live_exam_questions where session_id=$1 and question_id=$2`,
      [sessionId,QUESTION],
    );
    const sessionQuestionId=String(questionRow.rows[0].id);

    const opened=await control.openRoom(teacher,sessionId,version);
    expect(opened.status).toBe('lobby');
    version=opened.version;

    const joinedA=await participation.join(studentA,published.joinCode);
    expect(joinedA.reused).toBe(false);
    version=joinedA.version!;
    const joinedB=await participation.join(studentB,published.joinCode);
    expect(joinedB.reused).toBe(false);
    version=joinedB.version!;

    const started=await control.start(teacher,sessionId,version);
    expect(started.status).toBe('question_open');
    version=started.version;

    const teacherBeforeReveal=await runtime.snapshot(teacher,sessionId);
    const studentBeforeReveal=await runtime.snapshot(studentA,sessionId);
    expect(teacherBeforeReveal.markScheme).toBeNull();
    expect(studentBeforeReveal.markScheme).toBeNull();
    expect(studentBeforeReveal.questions).toEqual([]);
    expect(studentBeforeReveal.participants).toEqual([]);
    const boardBeforeReveal=projectLiveExamForBoard(teacherBeforeReveal);
    expect(boardBeforeReveal.question?.sourceRef).toBe('9618/11/M/J/25 Q1');
    expect(boardBeforeReveal.markScheme).toBeNull();
    expect(boardBeforeReveal.session.joinCode).toBeNull();
    expect(JSON.stringify(boardBeforeReveal)).not.toContain(sessionId);
    expect(JSON.stringify(boardBeforeReveal)).not.toContain(studentA.fullName);

    await expect(control.pause(teacher,sessionId,version-1))
      .rejects.toMatchObject({code:'live_state_conflict',status:409});

    const paused=await control.pause(teacher,sessionId,version);
    expect(paused.status).toBe('paused');
    version=paused.version;
    const resumed=await control.resume(teacher,sessionId,version);
    expect(resumed.status).toBe('question_open');
    version=resumed.version;

    const submittedA=await runtime.submitAnswer(studentA,sessionId,'Student A answer');
    version=submittedA.version;
    const submittedB=await runtime.submitAnswer(studentB,sessionId,'Student B answer');
    version=submittedB.version;

    const locked=await control.lockAnswers(teacher,sessionId,version);
    expect(locked.status).toBe('answers_locked');
    version=locked.version;
    await expect(runtime.submitAnswer(studentA,sessionId,'late mutation'))
      .rejects.toMatchObject({code:'live_answer_locked',status:409});

    const revealed=await control.revealMarkScheme(teacher,sessionId,version);
    expect(revealed.status).toBe('marking');
    version=revealed.version;

    const teacherAfterReveal=await runtime.snapshot(teacher,sessionId);
    const boardAfterReveal=projectLiveExamForBoard(teacherAfterReveal);
    expect(boardAfterReveal.markScheme?.maxMarks).toBe(2);
    expect(boardAfterReveal.markScheme?.points).toHaveLength(2);
    const serializedBoard=JSON.stringify(boardAfterReveal);
    expect(serializedBoard).not.toContain(POINT_1);
    expect(serializedBoard).not.toContain(POINT_2);
    expect(serializedBoard).not.toContain(studentA.fullName);
    expect(serializedBoard).not.toContain(studentB.fullName);

    const reviewRows=await pool.query(
      `select r.id,r.reviewer_id,owner.student_id answer_owner
       from live_exam_reviews r
       join live_exam_answers a on a.id=r.answer_id
       join live_exam_participants owner on owner.id=a.participant_id
       where r.session_question_id=$1
       order by r.id`,
      [sessionQuestionId],
    );
    expect(reviewRows.rowCount).toBe(2);
    expect(reviewRows.rows.every(row=>String(row.reviewer_id)!==String(row.answer_owner))).toBe(true);
    expect(new Set(reviewRows.rows.map(row=>String(row.reviewer_id)))).toEqual(new Set([studentA.id,studentB.id]));

    for(const row of reviewRows.rows){
      const reviewer=String(row.reviewer_id)===studentA.id?studentA:studentB;
      const result=await runtime.submitReview(reviewer,sessionId,String(row.id),{
        matchedPointIds:[POINT_1,POINT_2],
        feedback:'Peer checked against the revealed Mark Scheme.',
      });
      expect(result.score).toBe(2);
      version=result.version;
    }

    const reviewed=await control.completeMarking(teacher,sessionId,version);
    expect(reviewed.status).toBe('review');
    version=reviewed.version;

    const firstAnswer=await pool.query(
      `select a.id
       from live_exam_answers a
       join live_exam_participants p on p.id=a.participant_id
       where a.session_question_id=$1 and p.student_id=$2`,
      [sessionQuestionId,studentA.id],
    );
    const moderated=await moderation.moderate(teacher,sessionId,String(firstAnswer.rows[0].id),{
      score:1,
      feedback:'Teacher correction',
      reason:'Corrected against canonical Mark Scheme.',
      expectedVersion:version,
    });
    expect(moderated.reason).toBe('Corrected against canonical Mark Scheme.');
    version=moderated.version;

    const finished=await control.nextQuestion(teacher,sessionId,version);
    expect(finished.status).toBe('finished');
    version=finished.version;

    const session=await pool.query(`select status::text,version from live_exam_sessions where id=$1`,[sessionId]);
    expect(session.rows[0]).toMatchObject({status:'finished'});
    expect(Number(session.rows[0].version)).toBe(version);

    const evidence=await pool.query(
      `select student_id,marks_earned,marks_possible,teacher_overridden
       from live_exam_learning_evidence where session_id=$1 order by student_id`,
      [sessionId],
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
      [sessionId],
    );
    expect(audit.rows[0]).toMatchObject({reason:'Corrected against canonical Mark Scheme.'});
    expect(Number(audit.rows[0].new_score)).toBe(1);

    const versions=await pool.query(
      `select count(*)::int event_count,count(distinct session_version)::int distinct_versions,
              max(session_version)::bigint max_version
       from live_exam_events where session_id=$1`,
      [sessionId],
    );
    expect(versions.rows[0].event_count).toBe(versions.rows[0].distinct_versions);
    expect(Number(versions.rows[0].max_version)).toBe(version);
  });
});
