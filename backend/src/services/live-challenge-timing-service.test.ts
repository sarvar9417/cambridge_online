import { describe,expect,it,vi } from 'vitest';
import type { Pool,PoolClient } from 'pg';
import { LiveChallengeTimingService } from './live-challenge-timing-service.js';

const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';
const roundId='22222222-2222-4222-8222-222222222222';
const client=(query:ReturnType<typeof vi.fn>)=>({query,release:vi.fn()} as unknown as PoolClient);

describe('LiveChallengeTimingService',()=>{
  it('does nothing for teacher-controlled rounds',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'QUESTION_ACTIVE',state_version:4,settings_json:{timing_mode:'teacher'}}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeTimingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.reconcile(teacher,challengeId)).resolves.toEqual({challengeId,changed:false,status:'QUESTION_ACTIVE',stateVersion:4});
  });

  it('keeps an unexpired timed round active and returns server remaining seconds',async()=>{
    const startedAt=new Date('2026-09-09T18:00:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'QUESTION_ACTIVE',state_version:7,settings_json:{timing_mode:'per_question',default_time_limit_seconds:60}}]};
      if(sql.includes('select r.id round_id'))return{rowCount:1,rows:[{round_id:roundId,started_at:startedAt,time_limit_seconds:null}]};
      if(sql.includes('remaining_seconds'))return{rowCount:1,rows:[{expired:false,remaining_seconds:21}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeTimingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.reconcile(teacher,challengeId)).resolves.toEqual({challengeId,changed:false,status:'QUESTION_ACTIVE',stateVersion:7,remainingSeconds:21});
  });

  it('locks answers and advances persistent state after the server deadline',async()=>{
    const startedAt=new Date('2026-09-09T18:00:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'QUESTION_ACTIVE',state_version:7,settings_json:{timing_mode:'per_question',default_time_limit_seconds:60}}]};
      if(sql.includes('select r.id round_id'))return{rowCount:1,rows:[{round_id:roundId,started_at:startedAt,time_limit_seconds:45}]};
      if(sql.includes('remaining_seconds'))return{rowCount:1,rows:[{expired:true,remaining_seconds:0}]};
      if(sql.includes('update live_challenge_answers'))return{rowCount:2,rows:[{id:'a1'},{id:'a2'}]};
      if(sql.includes('update live_challenge_rounds'))return{rowCount:1,rows:[{id:roundId}]};
      if(sql.includes('update live_challenges'))return{rowCount:1,rows:[{state_version:8}]};
      if(sql.includes("'question.locked'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeTimingService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.reconcile(teacher,challengeId)).resolves.toEqual({challengeId,changed:true,status:'ANSWERS_LOCKED',stateVersion:8,roundId,submissionCount:2,reason:'timer_expired'});
    expect(query).toHaveBeenCalledWith('commit');
  });
});
