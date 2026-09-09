import { describe,expect,it,vi } from 'vitest';
import type { Pool,PoolClient } from 'pg';
import { LiveChallengeSessionService } from './live-challenge-session-service.js';

const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student'};
const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';

describe('LiveChallengeSessionService',()=>{
  it('student feed is enrollment-scoped and never selects question or mark-scheme content',async()=>{
    const query=vi.fn(async(sql:string)=>({rowCount:1,rows:[{id:challengeId,title:'CPU Live',class_id:'class-1',class_name:'11-A',status:'PUBLISHED',join_code:'ABC234',settings_json:{allow_late_join:false},published_at:new Date(),started_at:null,current_question_position:null,teacher_name:'Teacher',syllabus_code:'9618',topic_title:'Processor fundamentals',subtopic_title:'CPU architecture',participant_status:null,joined_at:null,question_count:5,joined_count:0}]}));
    const service=new LiveChallengeSessionService({query} as unknown as Pool);
    const feed=await service.studentFeed(student);
    expect(feed[0]).toMatchObject({id:challengeId,status:'PUBLISHED',canJoin:true,questionCount:5});
    const sql=String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('join enrollments e');
    expect(sql).toContain('e.student_id=$1');
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

  it('upserts a joined participant and records an event for a valid class-scoped code',async()=>{
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
    expect(clientQuery).toHaveBeenCalledWith('commit');
  });

  it('blocks staff from the student join action before any database read',async()=>{
    const connect=vi.fn();
    const service=new LiveChallengeSessionService({connect} as unknown as Pool);
    await expect(service.join(teacher,'ABC234')).rejects.toMatchObject({code:'students_only',status:403});
    expect(connect).not.toHaveBeenCalled();
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
});
