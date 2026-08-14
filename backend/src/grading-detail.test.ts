import{describe,expect,it,vi}from'vitest';
import type{Pool}from'pg';
import type{Actor}from'./lib/actor.js';
import{GradingService}from'./services/grading-service.js';

const student:Actor={id:'student-a',role:'student',schoolId:'school-a',fullName:'Student A'};
const teacher:Actor={id:'teacher-a',role:'teacher',schoolId:'school-a',fullName:'Teacher A'};

describe('grading detail scope',()=>{
  it('hides unreleased or cross-student grading as 404',async()=>{
    const query=vi.fn().mockResolvedValue({rowCount:0,rows:[]});
    await expect(new GradingService({query}as unknown as Pool).detail(student,'grading-b'))
      .rejects.toMatchObject({code:'not_found',status:404});
    expect(query.mock.calls[0]![0]).toContain("g.released_at is not null");
    expect(query.mock.calls[0]![1]).toEqual(['grading-b','student','student-a','school-a']);
  });

  it('maps a visible grading and its final mark points',async()=>{
    const points=[{id:'point-a',code:'M1',text:'Method',matched:true,marks:1}];
    const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{id:'grading-a',status:'released',final_score:'1.5',teacher_feedback_md:'Good',released_at:'now',text:'Answer',display_ref:'1(a)',stem_md:'Solve',marks:2,answer_kind:'text',student_name:'Student A',points}]});
    await expect(new GradingService({query}as unknown as Pool).detail(student,'grading-a')).resolves.toMatchObject({id:'grading-a',finalScore:1.5,points});
  });

  it('binds a nested point update to the grading id in the URL',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[{grading_id:'grading-a'}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{grading_id:'grading-a'}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{final_score:'1'}]});
    await new GradingService({query}as unknown as Pool).togglePoint(teacher,'point-a',true,'grading-a');
    expect(query.mock.calls[0]![0]).toContain('g.id=$5');
    expect(query.mock.calls[0]![1]).toEqual(['point-a','teacher','school-a','teacher-a','grading-a']);
  });
});
