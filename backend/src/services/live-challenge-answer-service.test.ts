import { describe,expect,it,vi } from 'vitest';
import type { Pool,PoolClient } from 'pg';
import { LiveChallengeAnswerService } from './live-challenge-answer-service.js';

const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student'};
const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';
const roundId='22222222-2222-4222-8222-222222222222';
const answerId='33333333-3333-4333-8333-333333333333';

function clientWith(query:ReturnType<typeof vi.fn>){return{query,release:vi.fn()} as unknown as PoolClient}
function answerAccess(overrides:Record<string,unknown>={}){
  return{
    id:challengeId,status:'QUESTION_ACTIVE',state_version:4,settings_json:{auto_close_when_all_submitted:false},
    round_id:roundId,round_number:1,round_status:'QUESTION_ACTIVE',started_at:new Date(Date.now()-1000),
    time_limit_seconds:null,current_round_number:1,existing_answer_id:null,existing_answer_text:null,
    existing_submitted_at:null,existing_locked_at:null,existing_submission_duration_ms:null,...overrides,
  };
}

describe('LiveChallengeAnswerService',()=>{
  it('stores a student answer once and leaves the round open when auto-close is disabled',async()=>{
    const submittedAt=new Date('2026-09-09T17:00:30Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('existing_answer_id'))return{rowCount:1,rows:[answerAccess()]};
      if(sql.includes('insert into live_challenge_answers'))return{rowCount:1,rows:[{id:answerId,answer_text:'The CU decodes instructions.',submitted_at:submittedAt,locked_at:null,submission_duration_ms:1000}]};
      if(sql.includes("'answer.submitted'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    const result=await service.submit(student,challengeId,roundId,' The CU decodes instructions. ',4);
    expect(result).toMatchObject({id:answerId,roundId,text:'The CU decodes instructions.',challengeStatus:'QUESTION_ACTIVE',stateVersion:4,idempotent:false});
    expect(query.mock.calls.some(([sql])=>String(sql).includes("set status='ANSWERS_LOCKED'"))).toBe(false);
  });

  it('auto-locks the round after the final joined participant submits',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('existing_answer_id'))return{rowCount:1,rows:[answerAccess({state_version:8,settings_json:{auto_close_when_all_submitted:true}})]};
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
    await expect(service.submit(student,challengeId,roundId,'Answer',8)).resolves.toMatchObject({challengeStatus:'ANSWERS_LOCKED',stateVersion:9,idempotent:false});
    const countSql=String(query.mock.calls.find(([sql])=>String(sql).includes('joined_count'))?.[0]??'');
    expect(countSql).toContain("p.status='JOINED'");
    expect(countSql).toContain('p.student_id=a.student_id');
  });

  it('does not auto-lock from answers belonging to removed participants',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('existing_answer_id'))return{rowCount:1,rows:[answerAccess({state_version:10,settings_json:{auto_close_when_all_submitted:true}})]};
      if(sql.includes('insert into live_challenge_answers'))return{rowCount:1,rows:[{id:answerId,answer_text:'Current participant answer',submitted_at:new Date(),locked_at:null,submission_duration_ms:1000}]};
      if(sql.includes("'answer.submitted'"))return{rowCount:1,rows:[]};
      if(sql.includes('joined_count')){
        expect(sql).toContain("p.status='JOINED'");
        expect(sql).toContain('p.student_id=a.student_id');
        return{rowCount:1,rows:[{joined_count:2,answer_count:1}]};
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    const result=await service.submit(student,challengeId,roundId,'Current participant answer',10);
    expect(result).toMatchObject({challengeStatus:'QUESTION_ACTIVE',stateVersion:10});
    expect(query.mock.calls.some(([sql])=>String(sql).includes("update live_challenges set status='ANSWERS_LOCKED'"))).toBe(false);
  });

  it('returns the immutable submission for an identical network retry even after the round locked',async()=>{
    const submittedAt=new Date('2026-09-09T17:00:30Z');
    const lockedAt=new Date('2026-09-09T17:00:31Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('existing_answer_id'))return{rowCount:1,rows:[answerAccess({
        status:'ANSWERS_LOCKED',state_version:9,round_status:'ANSWERS_LOCKED',existing_answer_id:answerId,
        existing_answer_text:'Original answer',existing_submitted_at:submittedAt,existing_locked_at:lockedAt,
        existing_submission_duration_ms:1234,
      })]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.submit(student,challengeId,roundId,' Original answer ',4)).resolves.toMatchObject({
      id:answerId,text:'Original answer',challengeStatus:'ANSWERS_LOCKED',stateVersion:9,idempotent:true,
    });
    expect(query.mock.calls.some(([sql])=>String(sql).includes('insert into live_challenge_answers'))).toBe(false);
    expect(query.mock.calls.some(([sql])=>String(sql).includes("'answer.submitted'"))).toBe(false);
  });

  it('rejects a changed retry so the original submission stays immutable',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('existing_answer_id'))return{rowCount:1,rows:[answerAccess({existing_answer_id:answerId,existing_answer_text:'Original answer'})]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.submit(student,challengeId,roundId,'Changed answer',4)).rejects.toMatchObject({code:'live_challenge_answer_already_submitted',status:409});
    expect(query).toHaveBeenCalledWith('rollback');
  });

  it('rejects a stale round with no existing answer instead of writing into the current round',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('existing_answer_id'))return{rowCount:1,rows:[answerAccess({round_number:1,current_round_number:2})]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.submit(student,challengeId,roundId,'Stale answer',4)).rejects.toMatchObject({code:'live_challenge_answer_closed',status:409});
    expect(query.mock.calls.some(([sql])=>String(sql).includes('insert into live_challenge_answers'))).toBe(false);
  });

  it('fails closed when the per-question deadline expires inside the answer transaction',async()=>{
    const startedAt=new Date('2026-09-09T17:00:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('existing_answer_id'))return{rowCount:1,rows:[answerAccess({
        state_version:6,settings_json:{timing_mode:'per_question',default_time_limit_seconds:30,auto_close_when_all_submitted:false},
        started_at:startedAt,time_limit_seconds:null,
      })]};
      if(sql.includes('clock_timestamp()'))return{rowCount:1,rows:[{expired:true,duration_ms:'30001'}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client=clientWith(query);
    const service=new LiveChallengeAnswerService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.submit(student,challengeId,roundId,'Too late',6)).rejects.toMatchObject({code:'live_challenge_answer_closed',status:409});
    expect(query).toHaveBeenCalledWith('rollback');
    expect(query.mock.calls.some(([sql])=>String(sql).includes('insert into live_challenge_answers'))).toBe(false);
    const accessSql=String(query.mock.calls.find(([sql])=>String(sql).includes('existing_answer_id'))?.[0]??'');
    expect(accessSql).toContain('join live_challenge_questions lcq');
    expect(accessSql).toContain('r.id=$3');
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
    const query=vi.fn(async(sql:string)=>({rowCount:1,rows:[{challenge_status:'QUESTION_ACTIVE',state_version:3,round_id:roundId,round_number:1,round_status:'QUESTION_ACTIVE',answer_id:answerId,answer_text:'My answer',submitted_at:new Date(),locked_at:null,submission_duration_ms:1234,sql_seen:sql}]}));
    const service=new LiveChallengeAnswerService({query} as unknown as Pool);
    const result=await service.own(student,challengeId);
    expect(result.answer).toMatchObject({id:answerId,text:'My answer',submissionDurationMs:1234});
    expect(String(query.mock.calls[0]?.[0])).toContain('a.student_id=$2');
  });

  it('returns board progress counts only after staff class-control authorization',async()=>{
    const query=vi.fn(async(sql:string)=>{
      expect(sql).toContain("lc.teacher_id=$4");
      expect(sql).toContain("p.status='JOINED'");
      expect(sql).toContain('p.student_id=a.student_id');
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

  it('builds an anonymous cumulative scoreboard from released Cambridge rounds only',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('select lc.id,lc.status::text status,lc.state_version,lc.settings_json'))return{rowCount:1,rows:[{id:challengeId,status:'ROUND_RESULTS',state_version:15,settings_json:{display_name_mode:'anonymous'}}]};
      if(sql.includes('with released_rounds as'))return{rowCount:2,rows:[
        {student_id:'student-secret-a',full_name:'Alice Example',score:'7',max_marks:'10',total_duration_ms:'5000',answered_round_count:2,released_round_count:2},
        {student_id:'student-secret-b',full_name:'Bob Example',score:'5',max_marks:'10',total_duration_ms:'4000',answered_round_count:2,released_round_count:2},
      ]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnswerService({query} as unknown as Pool);
    const result=await service.scoreboard(teacher,challengeId);
    expect(result).toMatchObject({releasedRounds:2,maxMarks:10,classAveragePercentage:60,leaderboardMode:'marks',entries:[
      {rank:1,displayName:'Student 1',score:7,maxMarks:10,percentage:70,averageResponseMs:null},
      {rank:2,displayName:'Student 2',score:5,maxMarks:10,percentage:50,averageResponseMs:null},
    ]});
    const serialized=JSON.stringify(result);
    expect(serialized).not.toContain('student-secret-a');
    expect(serialized).not.toContain('Alice Example');
  });

  it('uses speed only as a tie-break so fewer Cambridge marks can never outrank more marks',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('select lc.id,lc.status::text status,lc.state_version,lc.settings_json'))return{rowCount:1,rows:[{id:challengeId,status:'FINISHED',state_version:20,settings_json:{leaderboard_mode:'marks_plus_small_speed_bonus',display_name_mode:'full_name'}}]};
      if(sql.includes('with released_rounds as'))return{rowCount:3,rows:[
        {student_id:'a',full_name:'Academic Slow',score:'8',max_marks:'10',total_duration_ms:'9000',answered_round_count:2,released_round_count:2},
        {student_id:'b',full_name:'Academic Fast',score:'8',max_marks:'10',total_duration_ms:'3000',answered_round_count:2,released_round_count:2},
        {student_id:'c',full_name:'Lower Fastest',score:'7',max_marks:'10',total_duration_ms:'1000',answered_round_count:2,released_round_count:2},
      ]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnswerService({query} as unknown as Pool);
    const result=await service.scoreboard(teacher,challengeId);
    expect(result.leaderboardMode).toBe('marks_plus_small_speed_bonus');
    expect(result.entries.map(entry=>entry.displayName)).toEqual(['Academic Fast','Academic Slow','Lower Fastest']);
    expect(result.entries.map(entry=>entry.score)).toEqual([8,8,7]);
    expect(result.entries.map(entry=>entry.averageResponseMs)).toEqual([1500,4500,500]);
  });
});