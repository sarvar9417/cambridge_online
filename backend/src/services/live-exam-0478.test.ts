import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { LiveExamService } from './live-exam-service.js';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';

const teacher = {id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher'};
const classId='22222222-2222-4222-8222-222222222222';

const paper2Input={
  classId,title:'0478 Paper 2 programming challenge',syllabusCode:'0478' as const,
  topicIds:[],subtopicIds:[],coursebookSectionCodes:[],
  questionCount:1,markingMode:'teacher' as const,includeDiagrams:true,
  excludeSeen:false,components:[2],questionOrder:'shuffled' as const,
};

describe('0478 Paper 2 Live Challenge service gates',()=>{
  it('accepts the IGCSE pool without requiring a 9618 Hodder chapter',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('from classes c'))return {rowCount:1,rows:[{id:classId,name:'AS'}]};
      if(sql.includes('select candidate.id'))return {rowCount:0,rows:[]};
      throw new Error('Unexpected SQL: '+sql);
    });
    const service=new LiveExamService({query} as unknown as Pool,{} as PgQuestionsRepository);
    await expect(service.create(teacher,paper2Input)).rejects.toMatchObject({
      code:'live_question_pool_small',status:409,
    });
    const sql=String(query.mock.calls.find(([s])=>String(s).includes('select candidate.id'))?.[0]??'');
    expect(sql).toContain("source_syllabus.code='0478'");
    expect(sql).toContain('source_component.number=2');
    expect(sql).toContain('readiness.target_syllabus_id=sp.syllabus_id');
    expect(sql).toContain('direct_t.syllabus_id=sp.syllabus_id');
    expect(sql).not.toContain("source_syllabus.code='9618'");
  });

  it('selects ONLY section-mapped 0478 question LOs for the requested Hodder book section',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('from classes c'))return {rowCount:1,rows:[{id:classId,name:'AS'}]};
      if(sql.includes('select candidate.id'))return {rowCount:0,rows:[]};
      throw new Error('Unexpected SQL: '+sql);
    });
    const service=new LiveExamService({query} as unknown as Pool,{} as PgQuestionsRepository);
    await expect(service.create(teacher,{...paper2Input,igcseBookSectionCodes:['7.7']}))
      .rejects.toMatchObject({code:'live_question_pool_small',status:409});
    const calls=query.mock.calls as unknown as [string,unknown[]][];
    const call=calls.find(([sql])=>sql.includes('select candidate.id'));
    expect(call?.[0]).toContain('book_lo.code=any(');
    expect(call?.[0]).toContain("book_sy.code='0478'");
    expect(call?.[0]).toContain('book_sy.valid_from>=2023');
    expect(call?.[0]).toContain('source_component.number=2');
    expect(call?.[1]).toContainEqual(['7-lo-07']);
  });
  it('rejects 0478 book sections supplied to a 9618 classroom game',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('from classes c'))return {rowCount:1,rows:[{id:classId,name:'AS'}]};
      throw new Error('Unexpected candidate query');
    });
    const service=new LiveExamService({query} as unknown as Pool,{} as PgQuestionsRepository);
    await expect(service.create(teacher,{...paper2Input,
      syllabusCode:'9618',igcseBookSectionCodes:['7.7'],
    })).rejects.toMatchObject({code:'live_book_syllabus_mismatch',status:400});
  });
  it('balances multi-chapter 0478 selections at chapter and section levels without mixing source syllabuses',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('from classes c'))return {rowCount:1,rows:[{id:classId,name:'AS'}]};
      if(sql.includes('from (')&&sql.includes('candidate'))return {rowCount:0,rows:[]};
      throw new Error('Unexpected query: '+sql.slice(0,90));
    });
    const service=new LiveExamService({query} as unknown as Pool,{} as PgQuestionsRepository);
    await expect(service.create(teacher,{
      ...paper2Input,igcseBookSectionCodes:['7.7','8.2'],questionOrder:'balanced',
      questionCount:2,
    })).rejects.toMatchObject({code:'live_question_pool_small',status:409});
    const call=(query.mock.calls as unknown as [string,unknown[]][])
      .find(([sql])=>sql.includes('partition by sectioned.chapter_bucket'));
    expect(call).toBeDefined();
    expect(call?.[0]).toContain('partition by bucketed.section_bucket');
    expect(call?.[0]).toContain("source_syllabus.code='0478'");
    expect(call?.[0]).toContain('source_component.number=2');
    expect(call?.[0]).toContain("book_sy.code='0478'");
    expect(call?.[1]).toContainEqual(['7-lo-07','8.2-lo-01','8.2-lo-02','8.2-lo-03']);
    expect(call?.[1]).toContainEqual(['7-lo-07']);
    expect(call?.[1]).toContainEqual(['8.2-lo-01','8.2-lo-02','8.2-lo-03']);
    expect(call?.[1]).toContain(2);
  });

  it('rejects Paper 1 or Hodder chapter filters on 0478',async()=>{
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('from classes c'))return {rowCount:1,rows:[{id:classId,name:'AS'}]};
      throw new Error('No candidate query expected');
    });
    const service=new LiveExamService({query} as unknown as Pool,{} as PgQuestionsRepository);
    await expect(service.create(teacher,{...paper2Input,components:[1]}))
      .rejects.toMatchObject({code:'live_0478_paper2_only',status:400});
    await expect(service.create(teacher,{...paper2Input,coursebookSectionCodes:['16.2']}))
      .rejects.toMatchObject({code:'live_0478_paper2_only',status:400});
    expect(query.mock.calls.every(([sql])=>!String(sql).includes('select candidate.id'))).toBe(true);
  });
});
