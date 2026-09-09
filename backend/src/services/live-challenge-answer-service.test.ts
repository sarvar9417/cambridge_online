import { describe,expect,it,vi } from 'vitest';
import type { Pool,PoolClient } from 'pg';
import { LiveChallengeAnswerService } from './live-challenge-answer-service.js';

const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student'};
const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';
const roundId='22222222-2222-4222-8222-222222222222';
const answerId='33333333-3333-4333-8333-333333333333';

function clientWith(query:ReturnType<typeof vi.fn>){return{query,release:vi.fn()} as unknown as PoolClient}

describe('LiveChallengeAnswerService',()=>{
  it('stores a student answer once and leaves the round open when auto-close is disabled',async()=>{
    const submittedAt=new Date('2026-09-09T17:00:30Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes("r.status='QUESTION_ACTIVE'"))return{rowCount:1,rows:[{id:challengeId,status:'QUESTION_ACTIVE',state_version:4,settings_json:{auto_close_when_all_submitted:false},round_id:roundId,started_at:new Date(Date.now()-1000)}]};
      if(sql.includes('insert into live_challenge_answers'))return{rowCount:1,rows:[{id:answerId,answer_text:'The CU decodes instructions.',submitted_at:submittedAt,locked_at:null,submission_duration_ms:1000}]};
      if(sql.includes("'answer.submitted'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    const result=await service.submit(student,challengeId,' The CU decodes instructions. ',4);
    expect(result).toMatchObject({id:answerId,roundId,text:'The CU decodes instructions.',challengeStatus:'QUESTION_ACTIVE',stateVersion:4});
    expect(query.mock.calls.some(([sql])=>String(sql).includes("set status='ANSWERS_LOCKED'"))).toBe(false);
  });

  it('auto-locks the round after the final joined participant submits',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes("r.status='QUESTION_ACTIVE'"))return{rowCount:1,rows:[{id:challengeId,status:'QUESTION_ACTIVE',state_version:8,settings_json:{auto_close_when_all_submitted:true},round_id:roundId,started_at:new Date(Date.now()-1000)}]};
      if(sql.includes('insert into live_challenge_answers'))return{rowCount:1,rows:[{id:answerId,answer_text:'Answer',submitted_at:new Date(),locked_at:null,submission_duration_ms:1000}]};
      if(sql.includes("'answer.submitted'"))return{rowCount:1,rows:[]};
      if(sql.includes('joined_count'))return{rowCount:1,rows:[{joined_count:2,answer_count:2}]};
      if(sql.includes('update live_challenge_answers set locked_at'))return{rowCount:2,rows:[]};
      if(sql.includes("update live_challenge_rounds set status='ANSWERS_LOCKED'"))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenges set status='ANSWERS_LOCKED'"))return{rowCount:1,rows:[{status:'ANSWERS_LOCKED',state_version:9}]};
      if(sql.includes("'round.answers_locked'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.submit(student,challengeId,'Answer',8)).resolves.toMatchObject({challengeStatus:'ANSWERS_LOCKED',stateVersion:9});
  });

  it('does not allow a second immutable submission for the same round',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes("r.status='QUESTION_ACTIVE'"))return{rowCount:1,rows:[{id:challengeId,status:'QUESTION_ACTIVE',state_version:2,settings_json:{auto_close_when_all_submitted:false},round_id:roundId,started_at:new Date()}]};
      if(sql.includes('insert into live_challenge_answers'))return{rowCount:0,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.submit(student,challengeId,'Second answer',2)).rejects.toMatchObject({code:'live_challenge_answer_already_submitted',status:409});
    expect(query).toHaveBeenCalledWith('rollback');
  });

  it('lets authorised staff lock an active round with optimistic state protection',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('from live_challenges lc')&&sql.includes('for update of lc,r'))return{rowCount:1,rows:[{id:challengeId,status:'QUESTION_ACTIVE',state_version:5,round_id:roundId,round_number:1,round_status:'QUESTION_ACTIVE'}]};
      if(sql.includes('update live_challenge_answers set locked_at'))return{rowCount:3,rows:[]};
      if(sql.includes("update live_challenge_rounds set status='ANSWERS_LOCKED'"))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenges set status='ANSWERS_LOCKED'"))return{rowCount:1,rows:[{status:'ANSWERS_LOCKED',state_version:6}]};
      if(sql.includes("'round.answers_locked'"))return{rowCount:1,rows:[]};
      if(sql.includes('select count(*)::int count'))return{rowCount:1,rows:[{count:3}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.lock(teacher,challengeId,5)).resolves.toEqual({id:challengeId,status:'ANSWERS_LOCKED',stateVersion:6,roundId,submissionCount:3});
  });

  it('returns only the requesting student own answer',async()=>{
    const query=vi.fn(async(sql:string)=>({rowCount:1,rows:[{challenge_status:'QUESTION_ACTIVE',state_version:3,round_id:roundId,round_number:1,round_status:'QUESTION_ACTIVE',answer_id:answerId,answer_text:'My answer',submitted_at:new Date(),locked_at:null,submission_duration_ms:1234}]}));
    const service=new LiveChallengeAnswerService({query} as unknown as Pool);
    const result=await service.own(student,challengeId);
    expect(result.answer).toMatchObject({id:answerId,text:'My answer',submissionDurationMs:1234});
    expect(String(query.mock.calls[0]?.[0])).toContain('a.student_id=$2');
  });

  it('returns board progress counts only after staff class-control authorization',async()=>{
    const query=vi.fn(async(sql:string)=>{
      expect(sql).toContain("lc.teacher_id=$4");
      return{rowCount:1,rows:[{id:challengeId,status:'PEER_MARKING',state_version:12,round_id:roundId,round_number:1,round_status:'PEER_MARKING',joined_count:20,answer_count:18,assignment_count:18,peer_mark_count:11}]};
    });
    const service=new LiveChallengeAnswerService({query} as unknown as Pool);
    await expect(service.metrics(teacher,challengeId)).resolves.toMatchObject({joinedCount:20,answerCount:18,assignmentCount:18,peerMarkCount:11});
  });

  it('event cursor exposes synchronization signals without actor ids or event payloads',async()=>{
    const createdAt=new Date('2026-09-09T17:10:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('join live_challenge_participants p'))return{rowCount:1,rows:[{id:challengeId,state_version:9}]};
      if(sql.includes('from live_challenge_events'))return{rowCount:2,rows:[
        {id:'41',event_type:'answer.submitted',created_at:createdAt,actor_id:'student-2',payload_json:{durationMs:1200}},
        {id:'42',event_type:'round.answers_locked',created_at:createdAt,actor_id:'teacher-1',payload_json:{automatic:true}},
      ]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnswerService({query} as unknown as Pool);
    const result=await service.events(student,challengeId,'40');
    expect(result).toMatchObject({stateVersion:9,cursor:'42',events:[{id:'41',eventType:'answer.submitted'},{id:'42',eventType:'round.answers_locked'}]});
    const serialized=JSON.stringify(result);
    expect(serialized).not.toContain('student-2');
    expect(serialized).not.toContain('durationMs');
    expect(String(query.mock.calls[0]?.[0])).toContain('e.student_id=$2');
  });
});
