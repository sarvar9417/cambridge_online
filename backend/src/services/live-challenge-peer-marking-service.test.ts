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
const scheme={maxMarks:2,guidanceMd:null,points:[{id:pointId,code:'A1',text:'Mentions decode',marks:1}],groups:[],levels:[]};
const client=(query:ReturnType<typeof vi.fn>)=>({query,release:vi.fn()} as unknown as PoolClient);

describe('LiveChallengePeerMarkingService',()=>{
  it('creates a deterministic derangement and opens peer marking transactionally',async()=>{
    const inserts:Array<unknown[]>=[];
    const query=vi.fn(async(sql:string,params?:unknown[])=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'ANSWERS_LOCKED',state_version:9,settings_json:{peer_marking_enabled:true},round_id:roundId,round_number:1,round_status:'ANSWERS_LOCKED',max_marks_snapshot:2,mark_scheme_snapshot:scheme}]};
      if(sql.includes('select id,student_id from live_challenge_answers'))return{rowCount:2,rows:[{id:answerA,student_id:'student-1'},{id:answerB,student_id:'student-2'}]};
      if(sql.includes('insert into live_challenge_peer_assignments')){inserts.push(params??[]);return{rowCount:1,rows:[]}}
      if(sql.includes("status='ASSIGNED'"))return{rowCount:1,rows:[{count:2}]};
      if(sql.includes("update live_challenge_rounds set status='PEER_MARKING'"))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenges set status='PEER_MARKING'"))return{rowCount:1,rows:[{state_version:10}]};
      if(sql.includes("'marking.started'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.start(teacher,challengeId,9)).resolves.toMatchObject({status:'PEER_MARKING',stateVersion:10,assignmentCount:2});
    expect(inserts).toHaveLength(2);
    for(const params of inserts)expect(params[1]).not.toBe(params[3]);
  });

  it('fails closed when fewer than two answers can be peer-assigned',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'ANSWERS_LOCKED',state_version:4,settings_json:{peer_marking_enabled:true},round_id:roundId,round_number:1,round_status:'ANSWERS_LOCKED'}]};
      if(sql.includes('select id,student_id from live_challenge_answers'))return{rowCount:1,rows:[{id:answerA,student_id:'student-1'}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.start(teacher,challengeId,4)).rejects.toMatchObject({code:'live_challenge_peer_assignment_unavailable',status:409});
    expect(query).toHaveBeenCalledWith('rollback');
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

  it('releases round results only after every peer assignment is submitted',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'PEER_MARKING',state_version:10,round_id:roundId,round_number:1,round_status:'PEER_MARKING'}]};
      if(sql.includes('assignment_count'))return{rowCount:1,rows:[{assignment_count:2,submitted_count:2}]};
      if(sql.includes("update live_challenge_rounds set status='ROUND_RESULTS'"))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenges set status='ROUND_RESULTS'"))return{rowCount:1,rows:[{state_version:11}]};
      if(sql.includes("'round.results_released'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengePeerMarkingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.release(teacher,challengeId,10)).resolves.toEqual({id:challengeId,status:'ROUND_RESULTS',stateVersion:11,roundId,markCount:2});
  });
});
