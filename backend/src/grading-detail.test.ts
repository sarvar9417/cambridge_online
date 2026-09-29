import{describe,expect,it,vi}from'vitest';
import type{Pool}from'pg';
import type{Actor}from'./lib/actor.js';
import{GradingService}from'./services/grading-service.js';

const student:Actor={id:'student-a',role:'student',schoolId:'school-a',fullName:'Student A'};
const teacher:Actor={id:'teacher-a',role:'teacher',schoolId:'school-a',fullName:'Teacher A'};

describe('grading detail scope',()=>{
  it('treats repeated release as a no-op without adding mastery or error counts',async()=>{
    const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{id:'grading-a'}]});
    const transaction=vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({rows:[{id:'submission-a',status:'released'}]})
      .mockResolvedValueOnce({rows:[{status:'released'}]})
      .mockResolvedValueOnce({});
    const release=vi.fn();
    const pool={query,connect:vi.fn().mockResolvedValue({query:transaction,release})}as unknown as Pool;
    await expect(new GradingService(pool).release(teacher,'grading-a')).resolves.toEqual({
      id:'grading-a',submissionReleased:true,
    });
    expect(transaction.mock.calls.some(([sql])=>/insert|update gradings/i.test(String(sql)))).toBe(false);
    expect(release).toHaveBeenCalledOnce();
  });

  it('returns the learner and question fields needed by the grading queue',async()=>{
    const points=[{id:'point-a',code:'M1',text:'39',matched:false,marks:1}];
    const query=vi.fn().mockResolvedValue({rowCount:1,rows:[{
      id:'grading-a',text:'39',display_ref:'Q1(a)(i)',stem_md:'Convert to denary.',
      marks:1,answer_kind:'text',student_name:'Student A',points,
    }]});
    await expect(new GradingService({query}as unknown as Pool).queue(teacher)).resolves.toEqual([{
      id:'grading-a',text:'39',displayRef:'Q1(a)(i)',stemMd:'Convert to denary.',
      marks:1,answerKind:'text',studentName:'Student A',points,
    }]);
  });

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
