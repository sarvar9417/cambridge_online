import { describe,expect,it,vi } from 'vitest';
import type { Pool,PoolClient } from 'pg';
import { LiveChallengePeerMarkingService } from './live-challenge-peer-marking-service.js';

const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student One'};
const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';
const roundId='22222222-2222-4222-8222-222222222222';
const assignmentId='33333333-3333-4333-8333-333333333333';
const answerA='44444444-4444-4444-8444-444444444444';
const answerB='55555555-5555-4555-8555-555555555555';
const pointId='66666666-6666-4666-8666-666666666666';
const nextChallengeQuestionId='77777777-7777-4777-8777-777777777777';
const nextRoundId='88888888-8888-4888-8888-888888888888';
const scheme={maxMarks:2,guidanceMd:null,points:[{id:pointId,code:'A1',text:'Mentions decode',marks:1}],groups:[],levels:[]};
const client=(query:ReturnType<typeof vi.fn>)=>({query,release:vi.fn()} as unknown as PoolClient);

describe('LiveChallengePeerMarkingService',()=>{
  it('creates a deterministic derangement from currently joined students only',async()=>{
    const inserts:Array<unknown[]>=[];
    const query=vi.fn(async(sql:string,params?:unknown[])=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'ANSWERS_LOCKED',state_version:9,settings_json:{peer_marking_enabled:true,teacher_override_enabled:true},round_id:roundId,round_number:1,round_status:'ANSWERS_LOCKED',max_marks_snapshot:2,mark_scheme_snapshot:scheme}]};
      if(sql.includes('select id,student_id from live_challenge_answers'))return{rowCount:2,rows:[{id:answerA,student_id:'student-1'},{id:answerB,student_id:'student-2'}]};
      if(sql.includes('insert into live_challenge_peer_assignments')){inserts.push(params??[]);return{rowCount:1,rows:[]}}
      if(sql.includes("status='ASSIGNED'"))return{rowCount:1,rows:[{count:2}]};
      if(sql.includes("update live_challenge_rounds set status='PEER_MARKING'"))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenges set status='PEER_MARKING'"))return{rowCount:1,rows:[{state_version:10}]};
      if(sql.includes("'marking.started'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.start(teacher,challengeId,9)).resolves.toMatchObject({status:'PEER_MARKING',stateVersion:10,assignmentCount:2,teacherModerationRequired:false});
    expect(inserts).toHaveLength(2);
    for(const params of inserts)expect(params[1]).not.toBe(params[3]);
    const answerSql=String(query.mock.calls.find(([sql])=>String(sql).includes('select id,student_id from live_challenge_answers'))?.[0]??'');
    expect(answerSql).toContain("p.status='JOINED'");
  });

  it('opens teacher-moderation fallback when only one locked joined answer exists',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'ANSWERS_LOCKED',state_version:4,settings_json:{peer_marking_enabled:true,teacher_override_enabled:true},round_id:roundId,round_number:1,round_status:'ANSWERS_LOCKED'}]};
      if(sql.includes('select id,student_id from live_challenge_answers'))return{rowCount:1,rows:[{id:answerA,student_id:'student-1'}]};
      if(sql.includes("status='ASSIGNED'"))return{rowCount:1,rows:[{count:0}]};
      if(sql.includes("update live_challenge_rounds set status='PEER_MARKING'"))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenges set status='PEER_MARKING'"))return{rowCount:1,rows:[{state_version:5}]};
      if(sql.includes("'marking.started'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.start(teacher,challengeId,4)).resolves.toMatchObject({status:'PEER_MARKING',stateVersion:5,assignmentCount:0,teacherModerationRequired:true});
    expect(query).toHaveBeenCalledWith('commit');
  });

  it('returns an anonymous peer answer and approved mark-scheme snapshot without owner identity',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('select lc.status::text status'))return{rowCount:1,rows:[{status:'PEER_MARKING',state_version:10,round_id:roundId,round_number:1}]};
      if(sql.includes('select pa.id peer_assignment_id'))return{rowCount:1,rows:[{peer_assignment_id:assignmentId,assignment_status:'ASSIGNED',answer_text:'The CU decodes the instruction.',max_marks_snapshot:2,mark_scheme_snapshot:scheme,display_ref:'9618/12/M/J/26 Q3(a)',awarded_marks:null,mark_points_json:null,feedback_text:null,submitted_at:null}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({query} as unknown as Pool);
    const result=await service.assignment(student,challengeId);
    expect(result.assignment).toMatchObject({id:assignmentId,answerText:'The CU decodes the instruction.',maxMarks:2});
    expect(result.assignment?.markScheme.points?.[0]).toMatchObject({id:pointId,code:'A1'});
    expect(result).not.toHaveProperty('answerStudentId');
    expect(JSON.stringify(result)).not.toContain('student-2');
  });

  it('stores one immutable peer mark and validates selected snapshot points',async()=>{
    const submittedAt=new Date('2026-09-09T17:15:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.status::text challenge_status'))return{rowCount:1,rows:[{challenge_status:'PEER_MARKING',round_id:roundId,peer_assignment_id:assignmentId,assignment_status:'ASSIGNED',max_marks_snapshot:2,mark_scheme_snapshot:scheme}]};
      if(sql.includes('select awarded_marks,mark_points_json'))return{rowCount:0,rows:[]};
      if(sql.includes('insert into live_challenge_peer_marks'))return{rowCount:1,rows:[{awarded_marks:'1',mark_points_json:[pointId],feedback_text:'Good',submitted_at:submittedAt}]};
      if(sql.includes("set status='SUBMITTED'"))return{rowCount:1,rows:[]};
      if(sql.includes("'peer_mark.submitted'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.submit(student,challengeId,{awardedMarks:1,markPointIds:[pointId],feedbackText:'Good'})).resolves.toMatchObject({peerAssignmentId:assignmentId,awardedMarks:1,immutable:true});
  });

  it('releases and records mastery only for currently joined answer owners',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'PEER_MARKING',state_version:10,round_id:roundId,round_number:1,round_status:'PEER_MARKING'}]};
      if(sql.includes('answer_count'))return{rowCount:1,rows:[{answer_count:2,resolved_count:2,peer_marked_count:2,override_count:0}]};
      if(sql.includes('insert into mastery'))return{rowCount:2,rows:[]};
      if(sql.includes("update live_challenge_rounds set status='ROUND_RESULTS'"))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenges set status='ROUND_RESULTS'"))return{rowCount:1,rows:[{state_version:11}]};
      if(sql.includes("'round.results_released'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.release(teacher,challengeId,10)).resolves.toEqual({id:challengeId,status:'ROUND_RESULTS',stateVersion:11,roundId,markCount:2,overrideCount:0,resolvedCount:2,masteryApplied:true});
    const countSql=String(query.mock.calls.find(([sql])=>String(sql).includes('answer_count'))?.[0]??'');
    const masterySql=String(query.mock.calls.find(([sql])=>String(sql).includes('insert into mastery'))?.[0]??'');
    expect(countSql).toContain("p.status='JOINED'");
    expect(masterySql).toContain("p.status='JOINED'");
  });

  it('allows teacher moderation to resolve a round with no peer assignment',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'PEER_MARKING',state_version:6,round_id:roundId,round_number:1,round_status:'PEER_MARKING'}]};
      if(sql.includes('answer_count'))return{rowCount:1,rows:[{answer_count:1,resolved_count:1,peer_marked_count:0,override_count:1}]};
      if(sql.includes('insert into mastery'))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenge_rounds set status='ROUND_RESULTS'"))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenges set status='ROUND_RESULTS'"))return{rowCount:1,rows:[{state_version:7}]};
      if(sql.includes("'round.results_released'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.release(teacher,challengeId,6)).resolves.toMatchObject({status:'ROUND_RESULTS',stateVersion:7,markCount:0,overrideCount:1,resolvedCount:1,masteryApplied:true});
  });

  it('advances ROUND_RESULTS to the next unused canonical question',async()=>{
    const startedAt=new Date('2026-09-09T18:00:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'ROUND_RESULTS',state_version:11,settings_json:{question_order:'fixed'},round_id:roundId,round_number:1,round_status:'ROUND_RESULTS'}]};
      if(sql.includes('not exists(select 1 from live_challenge_rounds'))return{rowCount:1,rows:[{id:nextChallengeQuestionId,position:2}]};
      if(sql.includes('insert into live_challenge_rounds'))return{rowCount:1,rows:[{id:nextRoundId,round_number:2,started_at:startedAt}]};
      if(sql.includes("set status='QUESTION_ACTIVE',current_question_position"))return{rowCount:1,rows:[{state_version:12,current_question_position:2}]};
      if(sql.includes("'question.advanced'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.advance(teacher,challengeId,11)).resolves.toMatchObject({id:challengeId,status:'QUESTION_ACTIVE',stateVersion:12,currentQuestionPosition:2,roundId:nextRoundId,roundNumber:2,finished:false});
    expect(query).toHaveBeenCalledWith('commit');
  });

  it('finishes the challenge when every selected question has a round',async()=>{
    const finishedAt=new Date('2026-09-09T18:05:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'ROUND_RESULTS',state_version:21,settings_json:{question_order:'fixed'},round_id:roundId,round_number:5,round_status:'ROUND_RESULTS'}]};
      if(sql.includes('not exists(select 1 from live_challenge_rounds'))return{rowCount:0,rows:[]};
      if(sql.includes("set status='FINISHED'"))return{rowCount:1,rows:[{state_version:22,finished_at:finishedAt}]};
      if(sql.includes("'challenge.finished'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.advance(teacher,challengeId,21)).resolves.toMatchObject({id:challengeId,status:'FINISHED',stateVersion:22,roundNumber:5,finished:true,finishedAt});
  });
});
