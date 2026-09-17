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
});
