import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { PgQuestionsRepository } from '../repositories/questions-repository.js';
import { LiveExamService, type CreateLiveExamInput } from './live-exam-service.js';

const teacher={id:'teacher',role:'teacher' as const,schoolId:'school',fullName:'Teacher'};
const base:CreateLiveExamInput={
  classId:'00000000-0000-4000-8000-000000000001',
  title:'Order verification',topicIds:[],subtopicIds:[],
  coursebookSectionCodes:['2.1','2.2'],
  questionCount:4,markingMode:'teacher',includeDiagrams:true,excludeSeen:false,
};
type PickMethod={
  chooseQuestionIds(
    actor:typeof teacher,input:CreateLiveExamInput,requireExact?:boolean,countOnly?:boolean,
    options?:{offset?:number;search?:string;sort?:'random'|'source';seed?:string}
  ):Promise<{ids:string[];total:number}>;
  groupSourceQuestionParts(rows:Array<{id:string;display_ref?:string|null;sort_order?:number|null}>):string[];
};
function picker(rows:Array<Record<string,unknown>>){
  const calls:Array<{sql:string;params:unknown[]} >=[];
  const query=vi.fn(async (sql:string,params:unknown[]=[])=>{
    calls.push({sql,params});
    return {rowCount:rows.length,rows};
  });
  const service=new LiveExamService({query} as unknown as Pool,{} as PgQuestionsRepository) as unknown as PickMethod;
  return {service,calls,query};
}

describe('Live Challenge saved question ordering',()=>{
  it('rejects Manual + Balanced at the service boundary, before querying the database',async()=>{
    const query=vi.fn();
    const service=new LiveExamService(
      {query} as unknown as Pool,{} as PgQuestionsRepository,
    );
    await expect(service.create(teacher,{
      ...base,questionIds:[
        '00000000-0000-4000-8000-000000000031',
        '00000000-0000-4000-8000-000000000032',
        '00000000-0000-4000-8000-000000000033',
        '00000000-0000-4000-8000-000000000034',
      ],questionOrder:'balanced',
    })).rejects.toMatchObject({code:'live_manual_balanced_unsupported',status:400});
    expect(query).not.toHaveBeenCalled();
  });


  it('uses round-robin section buckets after source-ready selection for Balanced Random',async()=>{
    const {service,calls}=picker([
      {id:'q21',display_ref:'9618/11/M/J/26 Q2(a)',sort_order:20,total_count:12},
      {id:'q51',display_ref:'9618/12/O/N/25 Q5',sort_order:50,total_count:12},
      {id:'q31',display_ref:'9618/11/M/J/26 Q3',sort_order:30,total_count:12},
      {id:'q61',display_ref:'9618/12/O/N/25 Q6',sort_order:60,total_count:12},
    ]);
    const result=await service.chooseQuestionIds(teacher,{...base,questionOrder:'balanced'},true,false,{seed:'controlled-seed'});
    expect(result).toEqual({ids:['q21','q51','q31','q61'],total:12});
    expect(calls).toHaveLength(1);
    expect(calls[0]!.sql).toContain('partition by bucketed.section_bucket');
    expect(calls[0]!.sql).toContain('partition by sectioned.chapter_bucket');
    expect(calls[0]!.sql).toContain('order by ranked.chapter_rank,md5(ranked.id::text || $1::text)');
    expect(calls[0]!.sql).toContain('case bucketed.section_bucket');
    // All 2.1/2.2 options belong to Chapter 2. Even with more sections there,
    // those questions must occupy just one chapter fairness bucket.
    expect(calls[0]!.sql).toMatch(/when 0 then 2/);
    expect(calls[0]!.sql).toMatch(/when 1 then 2/);
    expect(calls[0]!.sql).toContain('case when');
    expect(calls[0]!.sql).toContain('coursebook_lo.text ilike');
    expect(calls[0]!.sql).toContain('join questions bucket_question');
    expect(calls[0]!.sql).toContain('count(*) over()::int total_count');
    expect(calls[0]!.params[0]).toBe('controlled-seed');
    expect(calls[0]!.params[1]).toBe(base.classId);
    expect(calls[0]!.params).toContain(base.questionCount);
    expect(calls[0]!.params.length).toBeGreaterThan(5);
  });

  it('prioritizes chapters before sections when the teacher picks unequal section counts',async()=>{
    const {service,calls}=picker([
      {id:'a',display_ref:'9618/11/M/J/26 Q1',sort_order:1,total_count:4},
      {id:'b',display_ref:'9618/11/M/J/26 Q2',sort_order:2,total_count:4},
      {id:'c',display_ref:'9618/11/M/J/26 Q3',sort_order:3,total_count:4},
      {id:'d',display_ref:'9618/11/M/J/26 Q4',sort_order:4,total_count:4},
    ]);
    await service.chooseQuestionIds(teacher,{
      ...base,coursebookSectionCodes:['1.1','2.1','2.2'],
      questionOrder:'balanced',
    },true,false,{seed:'chapter-test'});
    const sql=calls[0]!.sql;
    expect(sql).toContain('partition by bucketed.section_bucket');
    expect(sql).toContain('partition by sectioned.chapter_bucket');
    expect(sql).toContain('order by sectioned.section_rank,md5(sectioned.id::text || $1::text)');
    expect(sql).toContain('order by ranked.chapter_rank');
    expect(sql).toMatch(/when \d+ then 1/);
    expect((sql.match(/when \d+ then 2/g)??[]).toHaveLength(2);
  });

  it('honors Automatic + Fixed by preserving exact source query order',async()=>{
    const {service,calls}=picker([
      {id:'new',display_ref:'9618/11/M/J/26 Q3',sort_order:3,total_count:2},
      {id:'old',display_ref:'9618/11/M/J/24 Q2',sort_order:2,total_count:2},
    ]);
    const result=await service.chooseQuestionIds(teacher,{...base,questionCount:2,questionOrder:'fixed'},true,false,{seed:'seed'});
    expect(result.ids).toEqual(['new','old']);
    expect(calls[0]!.sql).toContain('order by candidate.year desc,candidate.series,candidate.component,candidate.sort_order,candidate.display_ref,candidate.id');
    expect(calls[0]!.sql).not.toContain('$1::text');
    expect(calls[0]!.params[0]).toBe(base.classId);
    expect(calls[0]!.params).not.toContain('seed');
    expect(calls[0]!.sql).not.toContain('partition by bucketed.section_bucket');
  });

  it('keeps manual fixed selections in teacher-selected order',async()=>{
    const {service}=picker([
      {id:'q-a',display_ref:'9618/11/M/J/24 Q1(a)',total_count:2},
      {id:'q-b',display_ref:'9618/11/M/J/24 Q1(b)',total_count:2},
    ]);
    const result=await service.chooseQuestionIds(teacher,{
      ...base,questionCount:2,questionIds:['q-b','q-a'],questionOrder:'fixed',
    });
    expect(result.ids).toEqual(['q-b','q-a']);
  });

  it('keeps related parts adjacent and in their authentic part order, not across papers',()=>{
    const {service}=picker([]);
    const ids=service.groupSourceQuestionParts([
      {id:'b',display_ref:'9618/11/M/J/24 Q3(b)',sort_order:302},
      {id:'different',display_ref:'9618/12/M/J/24 Q3(b)',sort_order:302},
      {id:'a',display_ref:'9618/11/M/J/24 Q3(a)',sort_order:301},
      {id:'other',display_ref:'9618/11/M/J/24 Q7(a)',sort_order:701},
      {id:'c',display_ref:'9618/11/M/J/24 Q3(c)',sort_order:303},
    ]);
    expect(ids).toEqual(['a','b','c','different','other']);
  });

  it('falls back to seeded random when a single section is selected',async()=>{
    const {service,calls}=picker([{id:'q',display_ref:'9618/11/M/J/26 Q2',total_count:1}]);
    await service.chooseQuestionIds(teacher,{
      ...base,questionCount:1,coursebookSectionCodes:['2.1'],questionOrder:'balanced',
    },true,false,{seed:'seed'});
    expect(calls[0]!.sql).toContain('order by md5(candidate.id::text || $1::text)');
    expect(calls[0]!.sql).not.toContain('partition by bucketed.section_bucket');
  });
});
