import { afterAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import { LiveExamBuilderService } from './live-exam-builder-service.js';
import { LiveExamControlService } from './live-exam-control-service.js';
import { LiveExamModerationService } from './live-exam-moderation-service.js';
import { LiveExamParticipationService } from './live-exam-participation-service.js';
import { LiveExamService } from './live-exam-service.js';
import { LiveExamStudentFeedService } from './live-exam-student-feed-service.js';
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
const outsider:Actor={
  id:'20202020-2020-4202-8202-202020202020',
  role:'student',
  schoolId:'school',
  fullName:'Outside Student',
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
  const sessionIds:string[]=[];

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
  const studentFeed=new LiveExamStudentFeedService(pool);

  afterAll(async()=>{
    for(const id of sessionIds)await pool.query(`delete from live_exam_sessions where id=$1`,[id]);
    await pool.end();
  });

  it('runs builder + teacher + board + two students through the authoritative lifecycle',async()=>{
    const draft=await builder.createDraft(teacher,{
      classId:CLASS,
      title:'Service integration',
      topicId:TOPIC,
      subtopicId:SUBTOPIC,
      markingMode:'peer',
      settings:{allowLateJoin:true,autoCloseWhenAllSubmitted:false},
    });
    const sessionId=draft.id;
    sessionIds.push(sessionId);
    let version=draft.version;
    expect(draft.status).toBe('draft');

    const candidates=await builder.eligibleQuestions(teacher,{
      syllabusId:SYLLABUS,
      topicId:TOPIC,
      subtopicId:SUBTOPIC,
      limit:10,
    });
    expect(candidates.map(candidate=>candidate.id)).toContain(QUESTION);

    const autoSelected=await builder.autoSelect(teacher,sessionId,1,version);
    expect(autoSelected.questionIds).toEqual([QUESTION]);
    version=autoSelected.version;

    const selected=await builder.replaceQuestions(teacher,sessionId,[QUESTION],version);
    expect(selected.questionCount).toBe(1);
    version=selected.version;

    const published=await builder.publish(teacher,sessionId,version);
    expect(published.status).toBe('published');
    expect(published.joinCode).toMatch(/^\d{6}$/);
    version=published.version;

    const publishedFeed=await studentFeed.feed(studentA);
    expect(publishedFeed.upcoming).toEqual(expect.arrayContaining([
      expect.objectContaining({id:sessionId,status:'published',joined:false,canJoinWithCode:false}),
    ]));

    const questionRow=await pool.query(
      `select id from live_exam_questions where session_id=$1 and question_id=$2`,
      [sessionId,QUESTION],
    );
    const sessionQuestionId=String(questionRow.rows[0].id);

    const opened=await control.openRoom(teacher,sessionId,version);
    expect(opened.status).toBe('lobby');
    version=opened.version;

    const lobbyFeed=await studentFeed.feed(studentA);
    expect(lobbyFeed.upcoming).toEqual(expect.arrayContaining([
      expect.objectContaining({id:sessionId,status:'lobby',joined:false,canJoinWithCode:true}),
    ]));

    await expect(participation.join(studentA,'000000'))
      .rejects.toMatchObject({code:'live_code_not_found',status:404});
    await expect(participation.join(outsider,published.joinCode))
      .rejects.toMatchObject({code:'live_code_not_found',status:404});

    const joinedA=await participation.join(studentA,published.joinCode);
    expect(joinedA.reused).toBe(false);
    version=joinedA.version!;
    const duplicateA=await participation.join(studentA,published.joinCode);
    expect(duplicateA.reused).toBe(true);
    const afterDuplicateJoin=await pool.query(
      `select version from live_exam_sessions where id=$1`,
      [sessionId],
    );
    expect(Number(afterDuplicateJoin.rows[0].version)).toBe(version);

    const started=await control.start(teacher,sessionId,version);
    expect(started.status).toBe('question_open');
    version=started.version;
    await expect(control.start(teacher,sessionId,version))
      .rejects.toMatchObject({code:'live_invalid_state',status:409});

    const lateFeed=await studentFeed.feed(studentB);
    expect(lateFeed.upcoming).toEqual(expect.arrayContaining([
      expect.objectContaining({id:sessionId,status:'question_open',joined:false,canJoinWithCode:true}),
    ]));
    const joinedB=await participation.join(studentB,published.joinCode);
    expect(joinedB.reused).toBe(false);
    version=joinedB.version!;
    const lateJoinEvent=await pool.query(
      `select payload from live_exam_events
       where session_id=$1 and event_type='participant.joined' and actor_id=$2
       order by session_version desc limit 1`,
      [sessionId,studentB.id],
    );
    expect(lateJoinEvent.rows[0]?.payload).toMatchObject({late:true});

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
    await expect(runtime.submitAnswer(studentA,sessionId,'duplicate submit'))
      .rejects.toMatchObject({code:'live_answer_locked',status:409});
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

    const history=await studentFeed.feed(studentA);
    expect(history.history).toEqual(expect.arrayContaining([
      expect.objectContaining({id:sessionId,status:'finished',joined:true,earned:1,possible:2}),
    ]));

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

    await expect(control.nextQuestion(teacher,sessionId,version))
      .rejects.toMatchObject({code:'live_invalid_state',status:409});
    const evidenceAfterRetry=await pool.query(
      `select count(*)::int count from live_exam_learning_evidence where session_id=$1`,
      [sessionId],
    );
    expect(evidenceAfterRetry.rows[0].count).toBe(2);
  });

  it('auto-locks answers only after every active participant submits when enabled',async()=>{
    const draft=await builder.createDraft(teacher,{
      classId:CLASS,title:'Auto close policy',topicId:TOPIC,subtopicId:SUBTOPIC,
      markingMode:'teacher',settings:{allowLateJoin:false,autoCloseWhenAllSubmitted:true},
    });
    const sessionId=draft.id;sessionIds.push(sessionId);let version=draft.version;
    version=(await builder.replaceQuestions(teacher,sessionId,[QUESTION],version)).version;
    const published=await builder.publish(teacher,sessionId,version);version=published.version;
    version=(await control.openRoom(teacher,sessionId,version)).version;
    version=(await participation.join(studentA,published.joinCode)).version!;
    version=(await participation.join(studentB,published.joinCode)).version!;
    version=(await control.start(teacher,sessionId,version)).version;

    const first=await runtime.submitAnswer(studentA,sessionId,'A');
    expect(first.answersLocked).toBe(false);
    version=first.version;
    const stillOpen=await pool.query(`select status::text from live_exam_sessions where id=$1`,[sessionId]);
    expect(stillOpen.rows[0].status).toBe('question_open');

    const second=await runtime.submitAnswer(studentB,sessionId,'B');
    expect(second.answersLocked).toBe(true);
    version=second.version;
    const locked=await pool.query(`select status::text,version from live_exam_sessions where id=$1`,[sessionId]);
    expect(locked.rows[0].status).toBe('answers_locked');
    expect(Number(locked.rows[0].version)).toBe(version);
    const beforeReveal=await runtime.snapshot(studentA,sessionId);
    expect(beforeReveal.markScheme).toBeNull();
  });

  it('fails closed for late-join-off, unsafe peer reveal and cancellation retries',async()=>{
    const draft=await builder.createDraft(teacher,{
      classId:CLASS,
      title:'Fail closed edge cases',
      topicId:TOPIC,
      subtopicId:SUBTOPIC,
      markingMode:'peer',
      settings:{allowLateJoin:false},
    });
    const sessionId=draft.id;
    sessionIds.push(sessionId);
    let version=draft.version;

    const selected=await builder.replaceQuestions(teacher,sessionId,[QUESTION],version);
    version=selected.version;
    const published=await builder.publish(teacher,sessionId,version);
    version=published.version;
    const opened=await control.openRoom(teacher,sessionId,version);
    version=opened.version;
    const joined=await participation.join(studentA,published.joinCode);
    version=joined.version!;
    const started=await control.start(teacher,sessionId,version);
    version=started.version;

    await expect(participation.join(studentB,published.joinCode))
      .rejects.toMatchObject({code:'live_join_closed',status:409});

    const locked=await control.lockAnswers(teacher,sessionId,version);
    version=locked.version;
    await expect(control.revealMarkScheme(teacher,sessionId,version))
      .rejects.toMatchObject({code:'live_peer_assignment_impossible',status:409});

    const cancelled=await control.cancel(teacher,sessionId,version);
    expect(cancelled.status).toBe('cancelled');
    version=cancelled.version;
    await expect(control.cancel(teacher,sessionId,version))
      .rejects.toMatchObject({code:'live_invalid_state',status:409});
  });

  it('rejects a selected question when its required source asset is unavailable',async()=>{
    const unavailableQuestions={
      portable:async(_actor:Actor,id:string)=>id===QUESTION?{
        sourceRef:'9618/11/M/J/25 Q1',
        leaf:{
          id:'15151515-1515-4151-8151-151515151515',
          rootId:'15151515-1515-4151-8151-151515151515',
          label:'1',path:'1',displayRef:'9618/11/M/J/25 Q1',
          stem:'State two valid points.',stemLatex:null,bodyFormat:'markdown',contentJson:null,
          commandWord:'State',marks:2,answerKind:'text',answerLines:2,
        },
        chain:[],dependencies:[],
        contextBlocks:[{
          id:'21212121-2121-4212-8212-212121212121',
          label:'1',displayRef:'9618/11/M/J/25 Q1',depth:0,context:null,
          assets:[{
            id:'22222222-aaaa-4222-8222-222222222222',
            kind:'diagram',storagePath:null,url:null,contentMd:null,
            altText:'Required diagram',sortOrder:0,sourcePage:1,
          }],
        }],
      }:null,
    } as unknown as PgQuestionsRepository;
    const unavailableBuilder=new LiveExamBuilderService(pool,unavailableQuestions);
    const draft=await unavailableBuilder.createDraft(teacher,{
      classId:CLASS,
      title:'Missing asset guard',
      topicId:TOPIC,
      subtopicId:SUBTOPIC,
      markingMode:'teacher',
    });
    sessionIds.push(draft.id);

    await expect(unavailableBuilder.replaceQuestions(teacher,draft.id,[QUESTION],draft.version))
      .rejects.toMatchObject({code:'live_assets_unavailable',status:409});
    const state=await pool.query(
      `select version,(select count(*)::int from live_exam_questions where session_id=$1) question_count
       from live_exam_sessions where id=$1`,
      [draft.id],
    );
    expect(Number(state.rows[0].version)).toBe(draft.version);
    expect(state.rows[0].question_count).toBe(0);
  });
});
