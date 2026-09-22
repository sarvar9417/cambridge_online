import { describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { SelectionGeneratorService } from './selection-generator-service.js';
import type { PgSelectionsRepository } from '../repositories/selections-repository.js';

const service = new SelectionGeneratorService(
  {} as Pool,
  {} as PgSelectionsRepository,
);

const candidate = (id:string,ref:string,marks:number) => ({
  id,
  root_id:id,
  display_ref:ref,
  marks,
  year:2025,
  command_word:null,
  primary_subtopic:'1.1',
  has_diagram:false,
});

const edge = (
  questionId:string,
  targetId:string,
  kind:'answer_ref'|'text_ref',
  sourceMarks:number,
  targetMarks:number,
) => ({
  question_id:questionId,
  depends_on_id:targetId,
  kind,
  strength:'required',
  source_ref:questionId,
  source_marks:sourceMarks,
  source_status:'approved',
  source_ms_ready:true,
  target_ref:targetId,
  target_marks:targetMarks,
  target_status:'approved',
  target_ms_ready:true,
  source_sort_order:2,
  target_sort_order:1,
});

type Expand = {
  expandDependencies(
    seedIds:string[],
    candidates:ReturnType<typeof candidate>[],
    edges:ReturnType<typeof edge>[],
  ):{
    items:Array<{questionId:string;role:'graded'|'context_only';sourceRef:string;marks:number}>;
    gradedMarks:number;
    gradedCount:number;
    contextCount:number;
  };
};

describe('SelectionGeneratorService dependency expansion',()=>{
  it('places an answer prerequisite before its dependent and keeps it graded',()=>{
    const result=(service as unknown as Expand).expandDependencies(
      ['q-b'],
      [candidate('q-b','Q1(b)',3),candidate('q-a','Q1(a)',2)],
      [edge('q-b','q-a','answer_ref',3,2)],
    );
    expect(result.items.map(item=>item.questionId)).toEqual(['q-a','q-b']);
    expect(result.items.map(item=>item.role)).toEqual(['graded','graded']);
    expect(result.gradedMarks).toBe(5);
  });

  it('adds printed-text prerequisites as context only',()=>{
    const result=(service as unknown as Expand).expandDependencies(
      ['q-b'],
      [candidate('q-b','Q2(b)',4),candidate('q-a','Q2(a)',2)],
      [edge('q-b','q-a','text_ref',4,2)],
    );
    expect(result.items.map(item=>[item.questionId,item.role])).toEqual([
      ['q-a','context_only'],
      ['q-b','graded'],
    ]);
    expect(result.gradedMarks).toBe(4);
    expect(result.contextCount).toBe(1);
  });

  it('upgrades a dependency to graded when it is also a selected seed',()=>{
    const result=(service as unknown as Expand).expandDependencies(
      ['q-a','q-b'],
      [candidate('q-a','Q3(a)',2),candidate('q-b','Q3(b)',3)],
      [edge('q-b','q-a','text_ref',3,2)],
    );
    expect(result.items.find(item=>item.questionId==='q-a')?.role).toBe('graded');
    expect(result.gradedMarks).toBe(5);
  });

  it('fails closed on dependency cycles',()=>{
    expect(()=> (service as unknown as Expand).expandDependencies(
      ['q-a'],
      [candidate('q-a','Q4(a)',2),candidate('q-b','Q4(b)',2)],
      [
        edge('q-a','q-b','answer_ref',2,2),
        edge('q-b','q-a','answer_ref',2,2),
      ],
    )).toThrow();
  });
});
