import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { LiveExamBuilderService } from './live-exam-builder-service.js';

const teacher = { id:'11111111-1111-4111-8111-111111111111',role:'teacher' as const,schoolId:'school',fullName:'Teacher' };
const student = { id:'22222222-2222-4222-8222-222222222222',role:'student' as const,schoolId:'school',fullName:'Student' };
const syllabusId='33333333-3333-4333-8333-333333333333';
const topicId='44444444-4444-4444-8444-444444444444';

function serviceFor(query:ReturnType<typeof vi.fn>) {
  return new LiveExamBuilderService({ query } as unknown as Pool);
}

describe('LiveExamBuilderService', () => {
  it('rejects student access before touching the database', async () => {
    const query=vi.fn();
    await expect(serviceFor(query).builderOptions(student)).rejects.toMatchObject({code:'staff_only',status:403});
    expect(query).not.toHaveBeenCalled();
  });

  it('returns only controlled class syllabus options and taxonomy', async () => {
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('from classes c')) return {rowCount:1,rows:[{
        id:'class-1',name:'AS Computer Science',grade:11,level:'AS',academic_year:'2026-2027',
        syllabus_id:syllabusId,syllabus_code:'9618',subject:'Computer Science',
      }]};
      if(sql.includes('from topics t')) return {rowCount:2,rows:[
        {topic_id:topicId,topic_number:1,topic_title:'Information representation',subtopic_id:'55555555-5555-4555-8555-555555555555',subtopic_code:'1.1',subtopic_title:'Data representation'},
        {topic_id:topicId,topic_number:1,topic_title:'Information representation',subtopic_id:'66666666-6666-4666-8666-666666666666',subtopic_code:'1.2',subtopic_title:'Multimedia'},
      ]};
      throw new Error(`unexpected query: ${sql}`);
    });
    const result=await serviceFor(query).builderOptions(teacher,syllabusId);
    expect(result.selectedSyllabusId).toBe(syllabusId);
    expect(result.syllabi).toEqual([{id:syllabusId,code:'9618',subject:'Computer Science'}]);
    expect(result.topics[0]).toMatchObject({id:topicId,number:1,title:'Information representation'});
    expect(result.topics[0]?.subtopics).toHaveLength(2);
    expect(result.defaultSettings.leaderboardMode).toBe('marks');
  });

  it('enforces source-complete and current-syllabus eligibility', async () => {
    const query=vi.fn(async(sql:string,params?:unknown[])=>{
      if(sql.includes('select s.id syllabus_id')) return {rowCount:1,rows:[{
        syllabus_id:syllabusId,syllabus_code:'9618',topic_id:topicId,topic_number:1,subtopic_id:null,subtopic_code:null,
      }]};
      if(sql.includes('from questions q')) {
        expect(sql).toContain("q.status='approved'::review_status");
        expect(sql).toContain("ms.status='approved'::review_status");
        expect(sql).toContain("q.content_version=1 and q.content_json is not null");
        expect(sql).toContain('question_source_occurrences occ');
        expect(sql).toContain('learning_objective_compatibility compat');
        expect(sql).toContain("compat.relation in ('equivalent','subtopic_compatible')");
        expect(sql).toContain('not exists(select 1 from question_dependencies qd where qd.question_id=q.id)');
        expect(sql).toContain("block->>'type'='asset'");
        expect(params).toEqual(['9618',1,null,syllabusId,25]);
        return {rowCount:1,rows:[{
          id:'q1',display_ref:'9618/12/M/J/26/1(a)',stem_md:'State one fact.',command_word:'State',marks:1,
          answer_kind:'text',ao:'AO1',year:2026,series:'M/J',variant:2,component:1,
        }]};
      }
      throw new Error(`unexpected query: ${sql}`);
    });
    const result=await serviceFor(query).eligibleQuestions(teacher,{syllabusId,topicId,limit:25});
    expect(result).toEqual([{
      id:'q1',displayRef:'9618/12/M/J/26/1(a)',stemMd:'State one fact.',commandWord:'State',marks:1,
      answerKind:'text',ao:'AO1',year:2026,series:'M/J',variant:2,component:1,
    }]);
  });

  it('rejects a subtopic without a topic', async () => {
    const query=vi.fn();
    await expect(serviceFor(query).eligibleQuestions(teacher,{
      syllabusId,subtopicId:'77777777-7777-4777-8777-777777777777',
    })).rejects.toMatchObject({code:'live_invalid_taxonomy',status:400});
    expect(query).not.toHaveBeenCalled();
  });
});
