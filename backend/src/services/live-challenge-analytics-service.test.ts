import { describe,expect,it,vi } from 'vitest';
import type { Pool,PoolClient } from 'pg';
import { LiveChallengeAnalyticsService } from './live-challenge-analytics-service.js';

const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';
const client=(query:ReturnType<typeof vi.fn>)=>({query,release:vi.fn()} as unknown as PoolClient);

describe('LiveChallengeAnalyticsService',()=>{
  it('merges released effective scores into existing mastery exactly once',async()=>{
    const recordedAt=new Date('2026-09-09T19:00:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status,lc.analytics_recorded_at'))return{rowCount:1,rows:[{id:challengeId,status:'FINISHED',analytics_recorded_at:null}]};
      if(sql.includes('insert into mastery'))return{rowCount:3,rows:[{student_id:'s1',subtopic_id:'st1'},{student_id:'s2',subtopic_id:'st1'},{student_id:'s2',subtopic_id:'st2'}]};
      if(sql.includes('set analytics_recorded_at=now()'))return{rowCount:1,rows:[{analytics_recorded_at:recordedAt}]};
      if(sql.includes("'analytics.mastery_recorded'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnalyticsService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.finalize(teacher,challengeId)).resolves.toEqual({challengeId,recorded:true,recordedAt,masteryRows:3});
    expect(query).toHaveBeenCalledWith('commit');
  });

  it('is idempotent after analytics_recorded_at has been persisted',async()=>{
    const recordedAt=new Date('2026-09-09T19:00:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status,lc.analytics_recorded_at'))return{rowCount:1,rows:[{id:challengeId,status:'FINISHED',analytics_recorded_at:recordedAt}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnalyticsService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.finalize(teacher,challengeId)).resolves.toEqual({challengeId,recorded:false,recordedAt,masteryRows:0});
    expect(query.mock.calls.some(([sql])=>String(sql).includes('insert into mastery'))).toBe(false);
  });

  it('refuses to record mastery before the challenge is finished',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status,lc.analytics_recorded_at'))return{rowCount:1,rows:[{id:challengeId,status:'ROUND_RESULTS',analytics_recorded_at:null}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnalyticsService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.finalize(teacher,challengeId)).rejects.toMatchObject({code:'live_challenge_invalid_transition',status:409});
  });
});
