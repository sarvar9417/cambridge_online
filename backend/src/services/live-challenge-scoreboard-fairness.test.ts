import { describe,expect,it,vi } from 'vitest';
import type { Pool } from 'pg';
import { LiveChallengeAnswerService } from './live-challenge-answer-service.js';

const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const challengeId='11111111-1111-4111-8111-111111111111';

describe('Live Challenge scoreboard fairness',()=>{
  it('uses speed only for students who answered every released round',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('select lc.id,lc.status::text status,lc.state_version,lc.settings_json')){
        return{rowCount:1,rows:[{
          id:challengeId,status:'FINISHED',state_version:21,
          settings_json:{leaderboard_mode:'marks_plus_small_speed_bonus',display_name_mode:'full_name'},
        }]};
      }
      if(sql.includes('with released_rounds as')){
        return{rowCount:3,rows:[
          {
            student_id:'incomplete',full_name:'A Incomplete',score:'8',max_marks:'10',
            total_duration_ms:'100',answered_round_count:1,released_round_count:2,
          },
          {
            student_id:'complete',full_name:'Z Complete',score:'8',max_marks:'10',
            total_duration_ms:'10000',answered_round_count:2,released_round_count:2,
          },
          {
            student_id:'lower',full_name:'Fast Lower Marks',score:'7',max_marks:'10',
            total_duration_ms:'1000',answered_round_count:2,released_round_count:2,
          },
        ]};
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const service=new LiveChallengeAnswerService({query} as unknown as Pool);
    const result=await service.scoreboard(teacher,challengeId);

    expect(result.entries.map(entry=>entry.displayName)).toEqual([
      'Z Complete','A Incomplete','Fast Lower Marks',
    ]);
    expect(result.entries.map(entry=>entry.score)).toEqual([8,8,7]);
    expect(result.entries.map(entry=>entry.averageResponseMs)).toEqual([5000,null,500]);
  });
});
