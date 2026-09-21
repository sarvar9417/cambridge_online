import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { LiveExamRoundSummaryService } from './live-exam-round-summary-service.js';

const teacher = { id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher' };
const student = { id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student' };

function serviceFor(query: ReturnType<typeof vi.fn>) {
  return new LiveExamRoundSummaryService({ query } as unknown as Pool);
}

describe('LiveExamRoundSummaryService', () => {
  it('is staff-only before querying the database', async () => {
    const query=vi.fn();
    await expect(serviceFor(query).summary(student,'session-1'))
      .rejects.toMatchObject({code:'staff_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });

  it('does not expose standings before round results are ready', async () => {
    const query=vi.fn().mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'marking',current_question_index:0}]});
    await expect(serviceFor(query).summary(teacher,'session-1'))
      .rejects.toMatchObject({code:'live_results_not_ready',status:409});
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns tied marks-first round standings, distribution and cumulative totals', async () => {
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'review',current_question_index:1}]})
      .mockResolvedValueOnce({rowCount:3,rows:[
        {student_id:'s1',full_name:'Ali',score:4,marks:5,rank:1},
        {student_id:'s2',full_name:'Vali',score:4,marks:5,rank:1},
        {student_id:'s3',full_name:'Salim',score:2,marks:5,rank:3},
      ]})
      .mockResolvedValueOnce({rowCount:3,rows:[
        {student_id:'s2',full_name:'Vali',score:8,rank:1},
        {student_id:'s1',full_name:'Ali',score:7,rank:2},
        {student_id:'s3',full_name:'Salim',score:5,rank:3},
      ]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:10}]});

    const result=await serviceFor(query).summary(teacher,'session-1');
    expect(result.marksFirst).toBe(true);
    expect(result.leaderboardMode).toBe('marks');
    expect(result.questionPosition).toBe(1);
    expect(result.round.possible).toBe(5);
    expect(result.round.average).toBeCloseTo(10/3);
    expect(result.round.distribution).toEqual([{score:4,count:2},{score:2,count:1}]);
    expect(result.round.standings.map((item)=>item.rank)).toEqual([1,1,3]);
    expect(result.overall.possible).toBe(10);
    expect(result.overall.standings[0]).toMatchObject({studentId:'s2',score:8,rank:1,possible:10});
  });

  it('keeps speed disabled unless the room explicitly enables a tie-break', async () => {
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'finished',current_question_index:0}]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:0}]});
    await serviceFor(query).summary(teacher,'session-1');
    const rankingSql=String(query.mock.calls[1]?.[0]??'');
    expect(rankingSql).toContain('rank() over(order by coalesce(a.final_score,0) desc');
    expect(query.mock.calls[1]?.[1]).toEqual(['session-1',0,false]);
  });

  it('excludes participants removed from the lobby from round and overall standings', async () => {
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'review',current_question_index:0,settings:{}}]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:0}]});
    await serviceFor(query).summary(teacher,'session-1');
    expect(String(query.mock.calls[1]?.[0])).toContain('lep.left_at is null');
    expect(String(query.mock.calls[2]?.[0])).toContain('lep.left_at is null');
  });

  it('derives each learner overall possible marks from answer rows so late joiners are not charged for earlier rounds', async () => {
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'review',current_question_index:2,settings:{}}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{student_id:'s1',full_name:'Late',score:3,marks:5,rank:1}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{student_id:'s1',full_name:'Late',score:3,possible:5,rank:1}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:15}]});
    const result=await serviceFor(query).summary(teacher,'session-1');
    const overallSql=String(query.mock.calls[2]?.[0]??'');
    expect(overallSql).toContain('join live_exam_answers a on a.participant_id=lep.id');
    expect(overallSql).toContain('coalesce(sum(leq.marks),0)::int possible');
    expect(result.overall.possible).toBe(15);
    expect(result.overall.standings[0]?.possible).toBe(5);
  });

  it('uses submission time only as an equal-mark tie-break when enabled', async () => {
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'review',current_question_index:0,settings:{leaderboardMode:'marks_speed_tiebreak'}}]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:0}]});
    const result=await serviceFor(query).summary(teacher,'session-1');
    expect(result.leaderboardMode).toBe('marks_speed_tiebreak');
    expect(String(query.mock.calls[1]?.[0])).toContain('case when $3::boolean then a.submitted_at');
    expect(String(query.mock.calls[1]?.[0])).toContain('order by score desc');
    expect(String(query.mock.calls[2]?.[0])).toContain('count(a.submitted_at)=count(*)');
    expect(String(query.mock.calls[2]?.[0])).toContain('order by score desc');
    expect(String(query.mock.calls[2]?.[0])).toContain('nulls last');
    expect(query.mock.calls[1]?.[1]).toEqual(['session-1',0,true]);
  });
});
