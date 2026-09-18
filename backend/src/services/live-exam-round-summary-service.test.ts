import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { LiveExamRoundSummaryService } from './live-exam-round-summary-service.js';

const teacher={id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const student={id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student'};

function serviceFor(query:ReturnType<typeof vi.fn>){return new LiveExamRoundSummaryService({query} as unknown as Pool);}

function readyQuery(settings:Record<string,unknown>={}){
  return vi.fn()
    .mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'review',current_question_index:1,settings}]})
    .mockResolvedValueOnce({rowCount:3,rows:[
      {student_id:'s1',full_name:'Ali Karimov',score:4,marks:5,rank:1},
      {student_id:'s2',full_name:'Vali Aliyev',score:4,marks:5,rank:1},
      {student_id:'s3',full_name:'Salim Ergashev',score:2,marks:5,rank:3},
    ]})
    .mockResolvedValueOnce({rowCount:3,rows:[
      {student_id:'s2',full_name:'Vali Aliyev',score:8,rank:1},
      {student_id:'s1',full_name:'Ali Karimov',score:7,rank:2},
      {student_id:'s3',full_name:'Salim Ergashev',score:5,rank:3},
    ]})
    .mockResolvedValueOnce({rowCount:1,rows:[{possible:10}]});
}

describe('LiveExamRoundSummaryService',()=>{
  it('is staff-only before querying the database',async()=>{
    const query=vi.fn();
    await expect(serviceFor(query).summary(student,'session-1')).rejects.toMatchObject({code:'staff_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });

  it('does not expose standings before round results are ready',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'marking',current_question_index:0,settings:{}}]});
    await expect(serviceFor(query).summary(teacher,'session-1')).rejects.toMatchObject({code:'live_results_not_ready',status:409});
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns tied marks-first teacher standings with internal learner identity',async()=>{
    const result=await serviceFor(readyQuery()).summary(teacher,'session-1');
    expect(result.marksFirst).toBe(true);
    expect(result.audience).toBe('teacher');
    expect(result.questionPosition).toBe(1);
    expect(result.round.distribution).toEqual([{score:4,count:2},{score:2,count:1}]);
    expect(result.round.standings.map(item=>item.rank)).toEqual([1,1,3]);
    expect(result.overall.standings[0]).toMatchObject({studentId:'s2',score:8,rank:1,possible:10});
  });

  it('removes internal learner IDs and applies first-name policy for the shared board',async()=>{
    const result=await serviceFor(readyQuery({displayNameMode:'first_name'})).summary(teacher,'session-1','board');
    expect(result.audience).toBe('board');
    expect(result.round.standings.map(item=>item.studentName)).toEqual(['Ali','Vali','Salim']);
    expect(result.round.standings.every(item=>!('studentId' in item))).toBe(true);
    expect(JSON.stringify(result)).not.toContain('"studentId"');
  });

  it('uses stable anonymous board labels without exposing IDs',async()=>{
    const result=await serviceFor(readyQuery({displayNameMode:'anonymous'})).summary(teacher,'session-1','board');
    expect(result.round.standings.every(item=>/^Learner \d+$/.test(item.studentName))).toBe(true);
    expect(new Set(result.round.standings.map(item=>item.studentName)).size).toBe(3);
    expect(JSON.stringify(result)).not.toContain('s1');
    expect(JSON.stringify(result)).not.toContain('s2');
  });

  it('never introduces a speed tie-breaker in the standings query',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'finished',current_question_index:0,settings:{}}]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:0}]});
    await serviceFor(query).summary(teacher,'session-1');
    const rankingSql=String(query.mock.calls[1]?.[0]??'');
    expect(rankingSql).toContain('rank() over(order by coalesce(a.final_score,0) desc)');
    expect(rankingSql).not.toContain('submitted_at');
  });
});
