import { describe,expect,it,vi } from 'vitest';
import { LiveExamAnalyticsService } from './live-exam-analytics-service.js';

const teacher={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
const student={...teacher,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',role:'student' as const};
const sessionId='22222222-2222-4222-8222-222222222222';

describe('LiveExamAnalyticsService',()=>{
  it('ranks LO evidence by Cambridge marks and reports only supported missed points',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{id:sessionId,title:'Challenge',status:'finished',class_name:'AS CS'}]})
      .mockResolvedValueOnce({rows:[
        {learning_objective_id:'lo-1',lo_code:'1.1.1',lo_text:'Explain data transmission',subtopic_code:'1.1',subtopic_title:'Data transmission',marks_earned:8,marks_possible:10,attempts:5},
        {learning_objective_id:'lo-2',lo_code:'1.1.2',lo_text:'Explain protocols',subtopic_code:'1.1',subtopic_title:'Data transmission',marks_earned:2,marks_possible:10,attempts:5},
      ]})
      .mockResolvedValueOnce({rows:[
        {code:'M2',text:'Mentions acknowledgement',marks:1,reviewed_count:5,missed_count:4},
      ]})
      .mockResolvedValueOnce({rows:[{evidence_rows:10,evidenced_answers:5,teacher_overridden_answers:1}]});
    const service=new LiveExamAnalyticsService({query} as never);
    const result=await service.summary(teacher,sessionId);

    expect(result.strongest[0]).toMatchObject({code:'1.1.1',mastery:0.8});
    expect(result.weakest[0]).toMatchObject({code:'1.1.2',mastery:0.2});
    expect(result.commonlyMissedMarkPoints[0]).toMatchObject({code:'M2',missedCount:4,reviewedCount:5});
    expect(result.evidence).toEqual({rows:10,answers:5,teacherOverriddenAnswers:1,marksOnly:true,speedIncluded:false});
    expect(result.missedPointCoverage).toBe('unmoderated_review_evidence');
    const missedSql=String(query.mock.calls[2]?.[0]);
    expect(missedSql).toContain('a.moderated_by is null');
    expect(missedSql).toContain('mark_scheme_snapshot');
  });

  it('fails closed before final evidence exists',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rowCount:1,rows:[{id:sessionId,title:'Challenge',status:'review',class_name:'AS CS'}]});
    const service=new LiveExamAnalyticsService({query} as never);
    await expect(service.summary(teacher,sessionId)).rejects.toMatchObject({code:'live_results_not_ready',status:409});
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('is staff-only',async()=>{
    const query=vi.fn();
    const service=new LiveExamAnalyticsService({query} as never);
    await expect(service.summary(student,sessionId)).rejects.toMatchObject({code:'staff_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });
});
