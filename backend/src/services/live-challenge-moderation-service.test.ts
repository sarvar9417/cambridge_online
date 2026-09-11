import { describe,expect,it,vi } from 'vitest';
import type { Pool,PoolClient } from 'pg';
import { LiveChallengeModerationService } from './live-challenge-moderation-service.js';

const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';
const roundId='22222222-2222-4222-8222-222222222222';
const answerId='33333333-3333-4333-8333-333333333333';
const studentId='44444444-4444-4444-8444-444444444444';
const client=(query:ReturnType<typeof vi.fn>)=>({query,release:vi.fn()} as unknown as PoolClient);

describe('LiveChallengeModerationService',()=>{
  it('pauses an active round and records the server pause timestamp',async()=>{
    const pausedAt=new Date('2026-09-09T18:30:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('lc.paused_from_status::text'))return{rowCount:1,rows:[{id:challengeId,status:'QUESTION_ACTIVE',state_version:7,paused_from_status:null,paused_at:null}]};
      if(sql.includes("set paused_from_status=status,paused_at=now(),status='PAUSED'"))return{rowCount:1,rows:[{paused_from_status:'QUESTION_ACTIVE',state_version:8,paused_at:pausedAt}]};
      if(sql.includes("'challenge.paused'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeModerationService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.pause(teacher,challengeId,7)).resolves.toMatchObject({status:'PAUSED',pausedFromStatus:'QUESTION_ACTIVE',stateVersion:8,pausedAt});
  });

  it('resumes a paused active question and shifts round start time by the paused duration',async()=>{
    const pausedAt=new Date('2026-09-09T18:30:00Z');
    const query=vi.fn(async(sql:string,params?:unknown[])=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('lc.paused_from_status::text'))return{rowCount:1,rows:[{id:challengeId,status:'PAUSED',state_version:8,paused_from_status:'QUESTION_ACTIVE',paused_at:pausedAt}]};
      if(sql.includes('set started_at=started_at+(now()-$2::timestamptz)')){
        expect(params).toEqual([challengeId,pausedAt]);
        return{rowCount:1,rows:[]};
      }
      if(sql.includes('set status=paused_from_status,paused_from_status=null,paused_at=null'))return{rowCount:1,rows:[{status:'QUESTION_ACTIVE',state_version:9}]};
      if(sql.includes("'challenge.resumed'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeModerationService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.resume(teacher,challengeId,8)).resolves.toEqual({id:challengeId,status:'QUESTION_ACTIVE',stateVersion:9,resumed:true});
  });

  it('cancels an unfinished challenge, pending peer work, and active round atomically',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('lc.paused_from_status::text'))return{rowCount:1,rows:[{id:challengeId,status:'PEER_MARKING',state_version:11,paused_from_status:null,paused_at:null}]};
      if(sql.includes('update live_challenge_peer_assignments pa'))return{rowCount:1,rows:[]};
      if(sql.includes("update live_challenge_rounds set status='CANCELLED'"))return{rowCount:1,rows:[]};
      if(sql.includes("set status='CANCELLED',join_code=null"))return{rowCount:1,rows:[{state_version:12}]};
      if(sql.includes("'challenge.cancelled'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeModerationService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.cancel(teacher,challengeId,11)).resolves.toEqual({id:challengeId,status:'CANCELLED',stateVersion:12,cancelled:true});
  });

  it('removes a participant before peer marking and audits the removal',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('lc.paused_from_status::text'))return{rowCount:1,rows:[{id:challengeId,status:'ANSWERS_LOCKED',state_version:9,paused_from_status:null,paused_at:null}]};
      if(sql.includes("set status='REMOVED'"))return{rowCount:1,rows:[{student_id:studentId}]};
      if(sql.includes('set state_version=state_version+1'))return{rowCount:1,rows:[{state_version:10}]};
      if(sql.includes("'participant.removed'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeModerationService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.removeParticipant(teacher,challengeId,studentId,9)).resolves.toEqual({id:challengeId,studentId,status:'REMOVED',stateVersion:10});
  });

  it('does not allow participant removal after peer marking has started',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('lc.paused_from_status::text'))return{rowCount:1,rows:[{id:challengeId,status:'PEER_MARKING',state_version:10,paused_from_status:null,paused_at:null}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeModerationService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.removeParticipant(teacher,challengeId,studentId,10)).rejects.toMatchObject({code:'live_challenge_participant_removal_closed',status:409});
  });

  it('lists teacher-visible answers with peer and override effective scores',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'PEER_MARKING',state_version:12,round_id:roundId,round_number:1,round_status:'PEER_MARKING',max_marks_snapshot:4,display_ref:'9618/12/M/J/26 Q3'}]};
      if(sql.includes('select a.id answer_id'))return{rowCount:1,rows:[{answer_id:answerId,student_id:studentId,full_name:'Student One',answer_text:'CPU decodes the instruction.',submitted_at:new Date(),assignment_status:'SUBMITTED',peer_score:'2',peer_marked_at:new Date(),override_score:'3',override_previous_score:'2',override_reason:'Teacher moderation',override_created_at:new Date()}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeModerationService({query} as unknown as Pool);
    const result=await service.list(teacher,challengeId);
    expect(result).toMatchObject({status:'PEER_MARKING',stateVersion:12,roundNumber:1,maxMarks:4});
    expect(result.answers[0]).toMatchObject({answerId,studentId,studentName:'Student One',peerScore:2,overrideScore:3,effectiveScore:3,resolved:true});
  });

  it('appends an audited override, cancels an unresolved peer assignment, and bumps state version',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'PEER_MARKING',state_version:12,settings_json:{teacher_override_enabled:true},round_id:roundId,round_number:1,round_status:'PEER_MARKING',max_marks_snapshot:4,display_ref:'9618/12/M/J/26 Q3'}]};
      if(sql.includes('select a.id,a.student_id'))return{rowCount:1,rows:[{id:answerId,student_id:studentId,peer_score:'2',override_score:null}]};
      if(sql.includes('insert into live_challenge_score_overrides'))return{rowCount:1,rows:[{id:'override-1',previous_score:'2',new_score:'3',reason:'Teacher moderation',created_at:new Date('2026-09-09T18:30:00Z')}]};
      if(sql.includes("set status='CANCELLED'"))return{rowCount:1,rows:[]};
      if(sql.includes('set state_version=state_version+1'))return{rowCount:1,rows:[{state_version:13}]};
      if(sql.includes("'score.overridden'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeModerationService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.override(teacher,challengeId,{answerId,newScore:3,reason:'Teacher moderation',expectedStateVersion:12})).resolves.toMatchObject({challengeId,roundId,answerId,stateVersion:13,previousScore:2,newScore:3});
    expect(query).toHaveBeenCalledWith('commit');
  });

  it('freezes teacher scores after round results are released',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'ROUND_RESULTS',state_version:13,settings_json:{teacher_override_enabled:true},round_id:roundId,round_number:1,round_status:'ROUND_RESULTS',max_marks_snapshot:4,display_ref:'Q3'}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeModerationService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.override(teacher,challengeId,{answerId,newScore:4,reason:'Late change',expectedStateVersion:13})).rejects.toMatchObject({code:'live_challenge_moderation_unavailable',status:409});
    expect(query).toHaveBeenCalledWith('rollback');
  });

  it('rejects out-of-range teacher scores before writing an override',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status'))return{rowCount:1,rows:[{id:challengeId,status:'PEER_MARKING',state_version:2,settings_json:{teacher_override_enabled:true},round_id:roundId,round_number:1,round_status:'PEER_MARKING',max_marks_snapshot:4,display_ref:'Q3'}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeModerationService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.override(teacher,challengeId,{answerId,newScore:5,reason:'Too high',expectedStateVersion:2})).rejects.toMatchObject({code:'live_challenge_peer_score_invalid',status:400});
    expect(query).toHaveBeenCalledWith('rollback');
  });
});
