import { describe,expect,it,vi } from 'vitest';
import type { Pool,PoolClient } from 'pg';
import { LiveChallengeAnalyticsService } from './live-challenge-analytics-service.js';

const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student'};
const challengeId='11111111-1111-4111-8111-111111111111';
const syllabusId='22222222-2222-4222-8222-222222222222';
const client=(query:ReturnType<typeof vi.fn>)=>({query,release:vi.fn()} as unknown as PoolClient);

describe('LiveChallengeAnalyticsService',()=>{
  it('summarizes released-round class performance, target LOs and commonly missed mark points without identities',async()=>{
    const query=vi.fn(async(sql:string,params?:unknown[])=>{
      if(sql.includes('lc.paused_from_status::text paused_from_status'))return{rowCount:1,rows:[{
        id:challengeId,status:'FINISHED',paused_from_status:null,state_version:22,class_id:'class-1',syllabus_id:syllabusId,school_id:'school-1',
      }]};
      if(sql.includes('select rr.round_id,rr.round_number'))return{rowCount:2,rows:[
        {round_id:'r1',round_number:1,question_id:'q1',display_ref:'Q1',max_marks_snapshot:2,participant_count:2,answered_count:2,class_score:'3',average_percentage:'75.0'},
        {round_id:'r2',round_number:2,question_id:'q2',display_ref:'Q2',max_marks_snapshot:4,participant_count:1,answered_count:1,class_score:'2',average_percentage:'50.0'},
      ]};
      if(sql.includes('mapped_los as')){
        expect(params).toEqual([challengeId,syllabusId]);
        expect(sql).toContain("compat.relation in('equivalent','subtopic_compatible')");
        expect(sql).toContain('target_t.syllabus_id=$2');
        return{rowCount:2,rows:[
          {lo_id:'lo-strong',lo_code:'2.1.1',lo_text:'Explain CPU components',subtopic_code:'2.1',subtopic_title:'CPU architecture',topic_number:2,topic_title:'Processor fundamentals',question_count:1,evidence_count:2,marks_earned:'3.2',marks_possible:'4',percentage:'80.0'},
          {lo_id:'lo-weak',lo_code:'2.1.2',lo_text:'Explain register use',subtopic_code:'2.1',subtopic_title:'CPU architecture',topic_number:2,topic_title:'Processor fundamentals',question_count:1,evidence_count:1,marks_earned:'1.6',marks_possible:'4',percentage:'40.0'},
        ]};
      }
      if(sql.includes('cross join lateral jsonb_array_elements')){
        expect(sql).toContain('pm.mark_points_json ?');
        expect(sql).toContain("participant.status='JOINED'");
        return{rowCount:1,rows:[{id:'mp-1',code:'A1',text:'Mentions the control signal',marks:'1',display_ref:'Q2',missed:2,total:3,miss_pct:'66.7'}]};
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnalyticsService({query} as unknown as Pool);
    const result=await service.summary(teacher,challengeId);
    expect(result).toMatchObject({
      challengeId,status:'FINISHED',stateVersion:22,releasedRounds:2,classAveragePercentage:62.5,
      strongestLearningObjectives:[{id:'lo-strong',code:'2.1.1',percentage:80}],
      weakestLearningObjectives:[{id:'lo-weak',code:'2.1.2',percentage:40}],
      missedMarkPoints:[{id:'mp-1',code:'A1',missed:2,total:3,missPercentage:66.7}],
    });
    expect(result.questions).toEqual([
      expect.objectContaining({roundNumber:1,questionRef:'Q1',participantCount:2,answeredCount:2,averagePercentage:75}),
      expect.objectContaining({roundNumber:2,questionRef:'Q2',participantCount:1,answeredCount:1,averagePercentage:50}),
    ]);
    expect(JSON.stringify(result)).not.toContain('student-1');
    expect(JSON.stringify(result)).not.toContain('full_name');
  });

  it('blocks students from class analytics before any database read',async()=>{
    const query=vi.fn();
    const service=new LiveChallengeAnalyticsService({query} as unknown as Pool);
    await expect(service.summary(student,challengeId)).rejects.toMatchObject({code:'staff_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });

  it('does not expose analytics before a released round exists',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('lc.paused_from_status::text paused_from_status'))return{rowCount:1,rows:[{
        id:challengeId,status:'QUESTION_ACTIVE',paused_from_status:null,state_version:5,class_id:'class-1',syllabus_id:syllabusId,
      }]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnalyticsService({query} as unknown as Pool);
    await expect(service.summary(teacher,challengeId)).rejects.toMatchObject({code:'live_challenge_analytics_unavailable',status:409});
  });

  it('finalizes challenge analytics without writing mastery a second time',async()=>{
    const recordedAt=new Date('2026-09-09T19:00:00Z');
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='commit')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status,lc.analytics_recorded_at'))return{rowCount:1,rows:[{id:challengeId,status:'FINISHED',analytics_recorded_at:null}]};
      if(sql.includes('released_rounds'))return{rowCount:1,rows:[{released_rounds:3}]};
      if(sql.includes('set analytics_recorded_at=now()'))return{rowCount:1,rows:[{analytics_recorded_at:recordedAt}]};
      if(sql.includes("'analytics.finalized'"))return{rowCount:1,rows:[]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnalyticsService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.finalize(teacher,challengeId)).resolves.toEqual({challengeId,recorded:true,recordedAt,masteryRows:0,releasedRounds:3});
    expect(query.mock.calls.some(([sql])=>String(sql).includes('insert into mastery'))).toBe(false);
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
    expect(query.mock.calls.some(([sql])=>String(sql).includes('released_rounds')||String(sql).includes('insert into mastery'))).toBe(false);
  });

  it('refuses to finalize analytics before the challenge is finished',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql==='begin'||sql==='rollback')return{rowCount:null,rows:[]};
      if(sql.includes('select lc.id,lc.status::text status,lc.analytics_recorded_at'))return{rowCount:1,rows:[{id:challengeId,status:'ROUND_RESULTS',analytics_recorded_at:null}]};
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnalyticsService({connect:vi.fn().mockResolvedValue(client(query))} as unknown as Pool);
    await expect(service.finalize(teacher,challengeId)).rejects.toMatchObject({code:'live_challenge_invalid_transition',status:409});
  });
});
