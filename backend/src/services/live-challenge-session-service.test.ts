import { describe,expect,it,vi } from 'vitest';
import type { Pool,PoolClient } from 'pg';
import { LiveChallengeSessionService } from './live-challenge-session-service.js';

const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student'};
const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';
const roundId='22222222-2222-4222-8222-222222222222';
const challengeQuestionId='33333333-3333-4333-8333-333333333333';
const questionId='44444444-4444-4444-8444-444444444444';

describe('LiveChallengeSessionService',()=>{
  it('student feed is enrollment-scoped and never selects join code, question or mark-scheme content',async()=>{
    const query=vi.fn(async(_sql:string)=>({rowCount:1,rows:[{id:challengeId,title:'CPU Live',class_id:'class-1',class_name:'11-A',status:'PUBLISHED',settings_json:{allow_late_join:false},published_at:new Date(),started_at:null,current_question_position:null,teacher_name:'Teacher',syllabus_code:'9618',topic_title:'Processor fundamentals',subtopic_title:'CPU architecture',participant_status:null,joined_at:null,question_count:5,joined_count:0}]}));
    const service=new LiveChallengeSessionService({query} as unknown as Pool);
    const feed=await service.studentFeed(student);
    expect(feed[0]).toMatchObject({id:challengeId,status:'PUBLISHED',canJoin:true,questionCount:5});
    expect(feed[0]).not.toHaveProperty('joinCode');
    const sql=String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('from enrollments e');
    expect(sql).toContain('e.student_id=$1');
    expect(sql).not.toContain('lc.join_code');
    expect(sql).not.toContain('mark_scheme_snapshot');
    expect(sql).not.toContain('content_json');
  });

  it('rejects a join code when it does not resolve through the student enrollment',async()=>{
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('from live_challenges lc'))return{rowCount:0,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client={query:clientQuery,release:vi.fn()} as unknown as PoolClient;
    const service=new LiveChallengeSessionService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.join(student,'ABC234')).rejects.toMatchObject({code:'live_challenge_join_not_found',status:404});
    expect(clientQuery).toHaveBeenCalledWith('rollback');
  });

  it('upserts a joined participant and records a non-secret event for a valid class-scoped code',async()=>{
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('from live_challenges lc'))return{rowCount:1,rows:[{id:challengeId,title:'CPU Live',class_id:'class-1',class_name:'11-A',status:'LOBBY',settings_json:{allow_late_join:false},started_at:null,join_code:'ABC234',teacher_name:'Teacher'}]};
      if(sql.includes('select status::text status from live_challenge_participants'))return{rowCount:0,rows:[]};
      if(sql.includes('insert into live_challenge_participants'))return{rowCount:1,rows:[]};
      if(sql.includes("'participant.joined'"))return{rowCount:1,rows:[]};
      if(sql.includes('select count(*)::int joined_count'))return{rowCount:1,rows:[{joined_count:3}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client={query:clientQuery,release:vi.fn()} as unknown as PoolClient;
    const service=new LiveChallengeSessionService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.join(student,'abc234')).resolves.toMatchObject({id:challengeId,status:'LOBBY',joinedCount:3,joined:true});
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).includes('join enrollments e'))).toBe(true);
    const eventSql=String(clientQuery.mock.calls.find(([sql])=>String(sql).includes("'participant.joined'"))?.[0]);
    expect(eventSql).not.toContain('payload_json');
    expect(eventSql).not.toContain('joinCode');
    expect(clientQuery).toHaveBeenCalledWith('commit');
  });

  it('allows late join only while the answer window is actively open',async()=>{
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('from live_challenges lc'))return{rowCount:1,rows:[{id:challengeId,title:'CPU Live',class_id:'class-1',class_name:'11-A',status:'QUESTION_ACTIVE',settings_json:{allow_late_join:true},started_at:new Date(),join_code:'ABC234',teacher_name:'Teacher'}]};
      if(sql.includes('select status::text status from live_challenge_participants'))return{rowCount:0,rows:[]};
      if(sql.includes('insert into live_challenge_participants'))return{rowCount:1,rows:[]};
      if(sql.includes("'participant.joined'"))return{rowCount:1,rows:[]};
      if(sql.includes('select count(*)::int joined_count'))return{rowCount:1,rows:[{joined_count:4}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client={query:clientQuery,release:vi.fn()} as unknown as PoolClient;
    const service=new LiveChallengeSessionService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.join(student,'ABC234')).resolves.toMatchObject({status:'QUESTION_ACTIVE',joined:true,joinedCount:4});
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).includes('insert into live_challenge_participants'))).toBe(true);
  });

  it('closes late join after answers lock even when the setting is enabled',async()=>{
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('from live_challenges lc'))return{rowCount:1,rows:[{id:challengeId,title:'CPU Live',class_id:'class-1',class_name:'11-A',status:'PEER_MARKING',settings_json:{allow_late_join:true},started_at:new Date(),join_code:'ABC234',teacher_name:'Teacher'}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client={query:clientQuery,release:vi.fn()} as unknown as PoolClient;
    const service=new LiveChallengeSessionService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.join(student,'ABC234')).rejects.toMatchObject({code:'live_challenge_join_closed',status:409});
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).includes('insert into live_challenge_participants'))).toBe(false);
    expect(clientQuery).toHaveBeenCalledWith('rollback');
  });

  it('blocks staff from the student join action before any database read',async()=>{
    const connect=vi.fn();
    const service=new LiveChallengeSessionService({connect} as unknown as Pool);
    await expect(service.join(teacher,'ABC234')).rejects.toMatchObject({code:'students_only',status:403});
    expect(connect).not.toHaveBeenCalled();
  });

  it('does not let a student leave while an active round is only paused',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('update live_challenge_participants')){
        expect(sql).toContain("lc.status in ('PUBLISHED','LOBBY')");
        expect(sql).toContain("lc.status='PAUSED'");
        expect(sql).toContain("lc.paused_from_status in ('PUBLISHED','LOBBY')");
        return{rowCount:0,rows:[]};
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeSessionService({query} as unknown as Pool);
    await expect(service.leave(student,challengeId)).rejects.toMatchObject({code:'live_challenge_leave_closed',status:409});
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('opens the lobby with optimistic state-version protection',async()=>{
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('from live_challenges lc'))return{rowCount:1,rows:[{id:challengeId,status:'PUBLISHED',state_version:4,join_code:'ABC234'}]};
      if(sql.includes("set status='LOBBY'"))return{rowCount:1,rows:[{id:challengeId,status:'LOBBY',state_version:5,join_code:'ABC234'}]};
      if(sql.includes("'challenge.lobby_opened'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client={query:clientQuery,release:vi.fn()} as unknown as PoolClient;
    const service=new LiveChallengeSessionService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.openLobby(teacher,challengeId,4)).resolves.toEqual({id:challengeId,status:'LOBBY',stateVersion:5,joinCode:'ABC234'});
    expect(clientQuery).toHaveBeenCalledWith('commit');
  });

  it('starts exactly one server-authoritative first round when at least one participant joined',async()=>{
    const startedAt=new Date('2026-09-09T16:00:00Z');
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.*,c.name class_name'))return{rowCount:1,rows:[{id:challengeId,status:'LOBBY',state_version:7,settings_json:{question_order:'fixed'},started_at:null}]};
      if(sql.includes('select count(*)::int count from live_challenge_participants'))return{rowCount:1,rows:[{count:2}]};
      if(sql.includes('from live_challenge_questions lcq'))return{rowCount:1,rows:[{id:challengeQuestionId,position:1}]};
      if(sql.includes('insert into live_challenge_rounds'))return{rowCount:1,rows:[{id:roundId,round_number:1,started_at:startedAt}]};
      if(sql.includes("set status='QUESTION_ACTIVE'"))return{rowCount:1,rows:[{id:challengeId,status:'QUESTION_ACTIVE',state_version:8,current_question_position:1,started_at:startedAt}]};
      if(sql.includes("'round.started'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client={query:clientQuery,release:vi.fn()} as unknown as PoolClient;
    const service=new LiveChallengeSessionService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.start(teacher,challengeId,7)).resolves.toMatchObject({
      id:challengeId,status:'QUESTION_ACTIVE',stateVersion:8,currentQuestionPosition:1,roundId,roundNumber:1,
    });
    expect(clientQuery).toHaveBeenCalledWith('commit');
  });

  it('fails closed instead of starting an empty classroom challenge',async()=>{
    const clientQuery=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.*,c.name class_name'))return{rowCount:1,rows:[{id:challengeId,status:'LOBBY',state_version:7,settings_json:{question_order:'fixed'},started_at:null}]};
      if(sql.includes('select count(*)::int count from live_challenge_participants'))return{rowCount:1,rows:[{count:0}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const client={query:clientQuery,release:vi.fn()} as unknown as PoolClient;
    const service=new LiveChallengeSessionService({connect:vi.fn().mockResolvedValue(client)} as unknown as Pool);
    await expect(service.start(teacher,challengeId,7)).rejects.toMatchObject({code:'live_challenge_participants_required',status:409});
    expect(clientQuery.mock.calls.some(([sql])=>String(sql).includes('insert into live_challenge_rounds'))).toBe(false);
    expect(clientQuery).toHaveBeenCalledWith('rollback');
  });

  it('projects the active canonical question to a joined student without selecting join code or leaking scheme/source controls',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('join live_challenge_participants p')){
        expect(sql).not.toContain('lc.*');
        expect(sql).not.toContain('join_code');
        return{rowCount:1,rows:[{
          id:challengeId,title:'CPU Live',class_id:'class-1',class_name:'11-A',status:'QUESTION_ACTIVE',
          state_version:8,current_question_position:1,settings_json:{timing_mode:'teacher'},syllabus_code:'9618',
          topic_title:'Processor fundamentals',subtopic_title:'CPU architecture',participant_status:'JOINED',
        }]};
      }
      if(sql.includes('from live_challenge_questions lcq'))return{rowCount:1,rows:[{
        challenge_question_id:challengeQuestionId,position:1,max_marks_snapshot:4,time_limit_seconds:null,
        source_occurrence_snapshot:{sourcePaperId:'paper-1'},mark_scheme_snapshot:{maxMarks:4,points:[{code:'A1'}]},
        question_id:questionId,display_ref:'9618/12/M/J/26 Q3(a)',stem_md:'State two functions of the control unit.',
        context_md:null,command_word:'State',marks:4,answer_kind:'text',content_json:null,content_version:null,parent_context:null,
        round_id:roundId,round_number:1,round_status:'QUESTION_ACTIVE',round_started_at:new Date('2026-09-09T16:00:00Z'),
        locked_at:null,marking_started_at:null,results_released_at:null,
      }]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeSessionService({query} as unknown as Pool);
    const state=await service.state(student,challengeId);
    expect(state).toMatchObject({id:challengeId,status:'QUESTION_ACTIVE',stateVersion:8,currentQuestionPosition:1,markScheme:null,source:null});
    expect(state).not.toHaveProperty('joinCode');
    expect(state.question).toMatchObject({id:questionId,displayRef:'9618/12/M/J/26 Q3(a)',marks:4,answerKind:'text'});
  });
});