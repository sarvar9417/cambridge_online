import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { LiveExamRoundSummaryService } from './live-exam-round-summary-service.js';

const teacher = { id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher' };
const student = { id:'student-1',role:'student' as const,schoolId:'school-1',fullName:'Student' };

function serviceFor(query: ReturnType<typeof vi.fn>) {
  return new LiveExamRoundSummaryService({ query } as unknown as Pool);
}

describe('LiveExamRoundSummaryService', () => {
  it('rejects student access unless the student belongs to a dedicated practice room', async () => {
    const query=vi.fn().mockResolvedValueOnce({rowCount:0,rows:[]});
    await expect(serviceFor(query).summary(student,'session-1'))
      .rejects.toMatchObject({code:'not_found',status:404});
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]?.[0])).toContain("les.settings->>'practiceMode'");
    expect(String(query.mock.calls[0]?.[0])).toContain('lep.student_id=$4');
  });

  it('anonymizes student practice standings even if room display names were configured to full',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{
        id:'session-1',status:'review',current_question_index:0,
        settings:{practiceMode:'group',displayNameMode:'full'},
      }]})
      .mockResolvedValueOnce({rowCount:1,rows:[{student_id:'s1',full_name:'Private Student',score:3,marks:4,rank:1,alias_no:1}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{student_id:'s1',full_name:'Private Student',score:3,rank:1,alias_no:1}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:4}]});
    const output=await serviceFor(query).summary(student,'session-1');
    expect(output.round.standings).toEqual([{rank:1,studentName:'Ishtirokchi 1',score:3,possible:4}]);
    expect(output.overall.standings[0]).not.toHaveProperty('studentId');
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

  it('excludes lobby leavers and keeps projector aliases stable across round and overall standings', async () => {
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'review',current_question_index:0,settings:{}}]})
      .mockResolvedValueOnce({rowCount:2,rows:[
        {student_id:'s2',full_name:'Vali',score:4,marks:5,rank:1,alias_no:2},
        {student_id:'s1',full_name:'Ali',score:3,marks:5,rank:2,alias_no:1},
      ]})
      .mockResolvedValueOnce({rowCount:2,rows:[
        {student_id:'s1',full_name:'Ali',score:8,rank:1,alias_no:1},
        {student_id:'s2',full_name:'Vali',score:7,rank:2,alias_no:2},
      ]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:5}]});

    const result=await serviceFor(query).summary(teacher,'session-1',true);
    expect(result.round.standings).toEqual([
      {rank:1,studentName:'Ishtirokchi 2',score:4,possible:5},
      {rank:2,studentName:'Ishtirokchi 1',score:3,possible:5},
    ]);
    expect(result.overall.standings).toEqual([
      {rank:1,studentName:'Ishtirokchi 1',score:8,possible:5},
      {rank:2,studentName:'Ishtirokchi 2',score:7,possible:5},
    ]);
    expect(result.round.standings.every((item)=>!('studentId' in item))).toBe(true);
    expect(String(query.mock.calls[1]?.[0])).toContain('lep.left_at is null');
    expect(String(query.mock.calls[2]?.[0])).toContain('lep.left_at is null');
  });

  it('applies the configured projector display-name privacy mode without student IDs', async () => {
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{
        id:'session-1',status:'review',current_question_index:0,
        settings:{displayNameMode:'initials'},
      }]})
      .mockResolvedValueOnce({rowCount:2,rows:[
        {student_id:'s1',full_name:'Ali Valiyev',score:4,marks:5,rank:1,alias_no:1},
        {student_id:'s2',full_name:'Malika Karimova',score:3,marks:5,rank:2,alias_no:2},
      ]})
      .mockResolvedValueOnce({rowCount:2,rows:[
        {student_id:'s1',full_name:'Ali Valiyev',score:4,rank:1,alias_no:1},
        {student_id:'s2',full_name:'Malika Karimova',score:3,rank:2,alias_no:2},
      ]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:5}]});

    const result=await serviceFor(query).summary(teacher,'session-1',true);
    expect(result.round.standings.map((item)=>item.studentName)).toEqual(['A.V.','M.K.']);
    expect(result.overall.standings.map((item)=>item.studentName)).toEqual(['A.V.','M.K.']);
    expect(result.round.standings.every((item)=>!('studentId' in item))).toBe(true);
  });

  it('supports first-name and full-name projector modes only when explicitly configured', async () => {
    const run=async(displayNameMode:'first_name'|'full')=>{
      const query=vi.fn()
        .mockResolvedValueOnce({rowCount:1,rows:[{
          id:'session-1',status:'review',current_question_index:0,settings:{displayNameMode},
        }]})
        .mockResolvedValueOnce({rowCount:1,rows:[
          {student_id:'s1',full_name:'Ali Valiyev',score:4,marks:5,rank:1,alias_no:1},
        ]})
        .mockResolvedValueOnce({rowCount:1,rows:[
          {student_id:'s1',full_name:'Ali Valiyev',score:4,rank:1,alias_no:1},
        ]})
        .mockResolvedValueOnce({rowCount:1,rows:[{possible:5}]});
      return serviceFor(query).summary(teacher,'session-1',true);
    };
    expect((await run('first_name')).round.standings[0]?.studentName).toBe('Ali');
    expect((await run('full')).round.standings[0]?.studentName).toBe('Ali Valiyev');
  });

  it('ranks teams by average Cambridge marks without replacing individual standings',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{
        id:'session-1',status:'review',current_question_index:0,
        settings:{competitionMode:'teams',competitionGroupNames:['Red','Blue']},
      }]})
      .mockResolvedValueOnce({rowCount:4,rows:[
        {student_id:'s1',full_name:'A',competition_group:1,score:5,marks:5,rank:1,alias_no:1},
        {student_id:'s2',full_name:'B',competition_group:1,score:3,marks:5,rank:2,alias_no:2},
        {student_id:'s3',full_name:'C',competition_group:2,score:2,marks:5,rank:3,alias_no:3},
        {student_id:'s4',full_name:'D',competition_group:2,score:2,marks:5,rank:3,alias_no:4},
      ]})
      .mockResolvedValueOnce({rowCount:4,rows:[
        {student_id:'s1',full_name:'A',competition_group:1,score:8,rank:1,alias_no:1},
        {student_id:'s2',full_name:'B',competition_group:1,score:6,rank:2,alias_no:2},
        {student_id:'s3',full_name:'C',competition_group:2,score:5,rank:3,alias_no:3},
        {student_id:'s4',full_name:'D',competition_group:2,score:3,rank:4,alias_no:4},
      ]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:10}]});
    const result=await serviceFor(query).summary(teacher,'session-1',true);
    expect(result.competition.mode).toBe('teams');
    expect(result.competition.roundStandings).toEqual([
      {rank:1,groupNo:1,label:'Red',score:4,possible:5,totalScore:8,memberCount:2},
      {rank:2,groupNo:2,label:'Blue',score:2,possible:5,totalScore:4,memberCount:2},
    ]);
    expect(result.competition.overallStandings[0]).toMatchObject({
      rank:1,groupNo:1,label:'Red',score:7,possible:10,totalScore:14,memberCount:2,
    });
    expect(result.round.standings).toHaveLength(4);
    expect(result.round.standings.every((item)=>!('studentId' in item))).toBe(true);
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

  it('uses submission time only as an equal-mark tie-break when enabled', async () => {
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:'session-1',status:'review',current_question_index:0,settings:{leaderboardMode:'marks_speed_tiebreak'}}]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:1,rows:[{possible:0}]});
    const result=await serviceFor(query).summary(teacher,'session-1');
    expect(result.leaderboardMode).toBe('marks_speed_tiebreak');
    expect(String(query.mock.calls[1]?.[0])).toContain('case when $3::boolean then a.submitted_at');
    expect(query.mock.calls[1]?.[1]).toEqual(['session-1',0,true]);
  });
});
