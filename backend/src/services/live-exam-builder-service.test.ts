import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { LiveExamBuilderService } from './live-exam-builder-service.js';

const student={id:'student',role:'student' as const,schoolId:'school',fullName:'Student'};
const teacher={id:'teacher',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};

describe('LiveExamBuilderService',()=>{
  it('rejects students before querying builder metadata',async()=>{
    const query=vi.fn();
    const service=new LiveExamBuilderService({query} as unknown as Pool);
    await expect(service.builderOptions(student)).rejects.toMatchObject({code:'staff_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });

  it('fails closed when a teacher asks for a syllabus outside controlled classes',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rows:[{
      id:'class-1',name:'10A',grade:10,level:'AS',academic_year:2026,
      syllabus_id:'11111111-1111-4111-8111-111111111111',syllabus_code:'9618',subject:'Computer Science',
    }]});
    const service=new LiveExamBuilderService({query} as unknown as Pool);
    await expect(service.builderOptions(teacher,'22222222-2222-4222-8222-222222222222'))
      .rejects.toMatchObject({code:'not_found',status:404});
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('requires eligible-question discovery to stay inside a controlled syllabus',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rows:[{
      id:'class-1',syllabus_id:'11111111-1111-4111-8111-111111111111',
    }]});
    const service=new LiveExamBuilderService({query} as unknown as Pool);
    await expect(service.eligibleQuestions(teacher,{
      syllabusId:'22222222-2222-4222-8222-222222222222',
      topicId:'33333333-3333-4333-8333-333333333333',
      limit:25,
    })).rejects.toMatchObject({code:'not_found',status:404});
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('uses the deterministic canonical Mark Scheme source for builder eligibility',async()=>{
    const syllabusId='11111111-1111-4111-8111-111111111111';
    const topicId='33333333-3333-4333-8333-333333333333';
    const query=vi.fn(async (sql:string)=>{
      if(sql.includes('from classes c join syllabi s'))return {rows:[{id:'class-1',syllabus_id:syllabusId}],rowCount:1};
      if(sql.includes('select s.code syllabus_code'))return {rows:[{syllabus_code:'9618',topic_number:1,subtopic_code:null}],rowCount:1};
      if(sql.includes('select q.id,q.display_ref'))return {rows:[],rowCount:0};
      throw new Error(`unexpected query: ${sql}`);
    });
    const service=new LiveExamBuilderService({query} as unknown as Pool);
    await expect(service.eligibleQuestions(teacher,{syllabusId,topicId,limit:25})).resolves.toEqual([]);
    const selectionSql=String(query.mock.calls.find(([sql])=>String(sql).includes('select q.id,q.display_ref'))?.[0]??'');
    expect(selectionSql).toContain('join canonical_mark_schemes ms on ms.question_id=q.id');
    expect(selectionSql).not.toContain('join mark_schemes ms on ms.question_id=q.id');
  });
});
