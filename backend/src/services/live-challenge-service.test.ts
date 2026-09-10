import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import {
  DEFAULT_LIVE_CHALLENGE_SETTINGS,
  LiveChallengeService,
  normalizeLiveChallengeSettings,
} from './live-challenge-service.js';

const teacher = { id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher' };
const student = { id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student' };
const challengeId = '11111111-1111-4111-8111-111111111111';
const syllabusId = '22222222-2222-4222-8222-222222222222';
const topicId = '33333333-3333-4333-8333-333333333333';
const subtopicId = '44444444-4444-4444-8444-444444444444';
const questionId = '55555555-5555-4555-8555-555555555555';

function eligibleRow(id=questionId) {
  return {
    id,
    display_ref:'9618/12/O/N/25 Q4(a)',
    stem_md:'Explain the purpose of the register.',
    command_word:'Explain',
    marks:2,
    answer_kind:'text',
    ao:'AO1',
    year:2025,
    series:'ON',
    variant:2,
    component:1,
    source_occurrence_snapshot:{sourcePaperId:'qp-1',qpSha256:'a'.repeat(64),msSha256:'b'.repeat(64)},
    mark_scheme_snapshot:{id:'ms-1',maxMarks:2,sourceSha256:'b'.repeat(64),points:[]},
  };
}

function taxonomyRow() {
  return {
    syllabus_id:syllabusId,syllabus_code:'9618',topic_id:topicId,topic_number:2,topic_title:'Processor fundamentals',
    subtopic_id:subtopicId,subtopic_code:'2.1',subtopic_title:'CPU architecture',
  };
}

describe('LiveChallengeService teacher builder',()=>{
  it('uses marks-first safe defaults and validates per-question timing',()=>{
    expect(DEFAULT_LIVE_CHALLENGE_SETTINGS).toMatchObject({
      questionOrder:'fixed',timingMode:'teacher',peerMarkingEnabled:true,teacherOverrideEnabled:true,leaderboardMode:'marks',
    });
    expect(()=>normalizeLiveChallengeSettings({defaultTimeLimitSeconds:9})).toThrowError(/live_challenge_invalid_time_limit/);
    expect(normalizeLiveChallengeSettings({defaultTimeLimitSeconds:90}).defaultTimeLimitSeconds).toBe(90);
  });

  it('never lets a student use the teacher eligibility endpoint',async()=>{
    const query=vi.fn();
    const service=new LiveChallengeService({query} as unknown as Pool);
    await expect(service.eligibleQuestions(student,{syllabusId})).rejects.toMatchObject({code:'staff_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });

  it('builds the eligible pool with QP/MS source, fidelity, target-LO, dependency and asset gates',async()=>{
    const query=vi.fn(async(sql:string,_params?:unknown[])=>{
      if(sql.includes('from syllabi s')&&sql.includes('left join topics'))return{rowCount:1,rows:[taxonomyRow()]};
      if(sql.includes('from questions q'))return{rowCount:1,rows:[eligibleRow()]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeService({query} as unknown as Pool);
    const rows=await service.eligibleQuestions(teacher,{syllabusId,topicId,subtopicId});
    expect(rows).toEqual([expect.objectContaining({id:questionId,marks:2,answerKind:'text'})]);
    expect(rows[0]).not.toHaveProperty('syllabusCode');
    const questionCall=query.mock.calls.find(([text])=>String(text).includes('from questions q'))!;
    const sql=String(questionCall[0]);
    expect(questionCall[1]?.[3]).toBe(syllabusId);
    expect(sql).toContain("q.status='approved'");
    expect(sql).toContain("ms.status='approved'");
    expect(sql).toContain("join source_papers ms_sp on ms_sp.id=ms.source_paper_id and ms_sp.kind='MS'::paper_kind");
    expect(sql).toContain('ms_sp.source_url is not null');
    expect(sql).toContain("lower(coalesce(ms_sp.sha256,'')) ~ '^[0-9a-f]{64}$'");
    expect(sql).toContain("'msSha256',lower(ms_sp.sha256)");
    expect(sql).toContain("q.content_version=1");
    expect(sql).toContain('question_learning_objectives qlo');
    expect(sql).toContain('learning_objective_compatibility compat');
    expect(sql).toContain("compat.relation in('equivalent','subtopic_compatible')");
    expect(sql).toContain('target_t.syllabus_id=$4::uuid');
    expect(sql).toContain("vf.severity='error'");
    expect(sql).toContain("qd.kind='answer_ref'");
    expect(sql).toContain("block->>'type'='asset'");
    expect(sql).toContain("q.answer_kind in ('text','pseudocode','code')");
  });

  it('fails closed when manual selection contains an ineligible question',async()=>{
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('from live_challenges lc'))return{rowCount:1,rows:[{id:challengeId,teacher_id:teacher.id,class_id:'class-1',syllabus_id:syllabusId,topic_id:topicId,subtopic_id:subtopicId,status:'DRAFT'}]};
      if(sql.includes('from syllabi s')&&sql.includes('left join topics'))return{rowCount:1,rows:[taxonomyRow()]};
      if(sql.includes('from questions q'))return{rowCount:0,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client={query:clientQuery,release:vi.fn()} as unknown as PoolClient;
    const pool={connect:vi.fn().mockResolvedValue(client)} as unknown as Pool;
    const service=new LiveChallengeService(pool);
    await expect(service.replaceQuestions(teacher,challengeId,[questionId])).rejects.toMatchObject({code:'live_challenge_questions_ineligible',status:409});
    expect(clientQuery).toHaveBeenCalledWith('rollback');
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).includes('delete from live_challenge_questions'))).toBe(false);
  });

  it('revalidates selected questions and refreshes source/mark snapshots before publish',async()=>{
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('from live_challenges lc'))return{rowCount:1,rows:[{id:challengeId,teacher_id:teacher.id,class_id:'class-1',syllabus_id:syllabusId,topic_id:topicId,subtopic_id:subtopicId,status:'DRAFT'}]};
      if(sql.includes('from live_challenge_questions')&&sql.includes('order by position'))return{rowCount:1,rows:[{question_id:questionId,position:1}]};
      if(sql.includes('from syllabi s')&&sql.includes('left join topics'))return{rowCount:1,rows:[taxonomyRow()]};
      if(sql.includes('from questions q'))return{rowCount:1,rows:[eligibleRow()]};
      if(sql.includes('update live_challenge_questions set'))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenges set status='PUBLISHED'"))return{rowCount:1,rows:[{id:challengeId,title:'CPU challenge',class_id:'class-1',join_code:'ABC234',status:'PUBLISHED',state_version:1,published_at:new Date()}]};
      if(sql.includes('insert into live_challenge_events'))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client={query:clientQuery,release:vi.fn()} as unknown as PoolClient;
    const pool={connect:vi.fn().mockResolvedValue(client)} as unknown as Pool;
    const service=new LiveChallengeService(pool);
    const result=await service.publish(teacher,challengeId);
    expect(result).toMatchObject({id:challengeId,status:'PUBLISHED',questionCount:1});
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).includes('update live_challenge_questions set'))).toBe(true);
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).includes("'challenge.published'"))).toBe(true);
    expect(clientQuery).toHaveBeenCalledWith('commit');
  });
});
