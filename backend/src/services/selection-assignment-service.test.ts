import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import type { PgSelectionsRepository } from '../repositories/selections-repository.js';
import { SelectionAssignmentService } from './selection-assignment-service.js';
import type { SelectionReview } from './selection-review.js';

const actor = { id:'teacher-1',role:'teacher' as const,schoolId:'school-1',fullName:'Teacher' };
const selectionId = '11111111-1111-4111-8111-111111111111';
const classId = '22222222-2222-4222-8222-222222222222';
const updatedAt = new Date('2026-08-14T12:00:00Z');

const portable = (id:string,rootId:string,sourceRef:string,marks:number) => ({
  leaf:{id,rootId,label:'a',path:'1.a',displayRef:sourceRef,stem:`Stem ${id}`,commandWord:'Explain',marks,answerKind:'text',answerLines:marks},
  chain:[{id:rootId,label:'1',depth:0},{id,label:'a',depth:1}],
  contextBlocks:[],dependencies:[],sourceRef,
});

const goodReview: SelectionReview = {
  items:[
    {id:'si-1',role:'graded',sortOrder:1,sourceRef:'9618/11/M/J/23 Q1(a)',portable:portable('33333333-3333-4333-8333-333333333333','root-1','9618/11/M/J/23 Q1(a)',3),freshRef:'Q1(a)',effectiveMarks:3},
    {id:'si-2',role:'context_only',sortOrder:2,sourceRef:'9618/11/M/J/23 Q1(b)',portable:portable('44444444-4444-4444-8444-444444444444','root-1','9618/11/M/J/23 Q1(b)',2),freshRef:'Q1(b)',effectiveMarks:0},
  ],
  totalMarks:3,dependencyIssues:[],canPublish:true,
};

function harness(review: SelectionReview | null = goodReview, lockedAt = updatedAt) {
  const reviewFn = vi.fn().mockResolvedValue(review);
  const poolQuery = vi.fn().mockResolvedValue({rowCount:1,rows:[{updated_at:updatedAt}]});
  const clientQuery = vi.fn(async (sql:string,values?:unknown[]) => {
    if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return {rowCount:null,rows:[]};
    if (sql.includes('from selections') && sql.includes('for update')) return {rowCount:1,rows:[{updated_at:lockedAt}]};
    if (sql.includes('from classes c')) return {rowCount:1,rows:[{}]};
    if (sql.includes('select count(*)::int count from questions')) return {rowCount:1,rows:[{count:2}]};
    if (sql.includes('insert into assignments')) return {rowCount:1,rows:[{id:'assignment-1',title:'Revision 1',mode:'online',total_marks:3,published_at:null}]};
    if (sql.includes('insert into assignment_questions')) return {rowCount:1,rows:[]};
    if (sql.includes('insert into assignment_context_items')) return {rowCount:1,rows:[]};
    if (sql.includes('insert into submissions')) return {rowCount:1,rows:[]};
    throw new Error(`Unexpected SQL: ${sql} ${JSON.stringify(values)}`);
  });
  const client = {query:clientQuery,release:vi.fn()} as unknown as PoolClient;
  const pool = {query:poolQuery,connect:vi.fn().mockResolvedValue(client)} as unknown as Pool;
  const selections = {review:reviewFn} as unknown as PgSelectionsRepository;
  return {service:new SelectionAssignmentService(pool,selections),poolQuery,clientQuery,reviewFn,client};
}

describe('SelectionAssignmentService',()=>{
  it('keeps graded questions separate from context-only paper items',async()=>{
    const h=harness();
    const result=await h.service.create(actor,selectionId,{classId,title:'Revision 1'});
    expect(result).toMatchObject({id:'assignment-1',totalMarks:3,itemCount:2,gradedCount:1,contextOnlyCount:1});

    const gradedCalls=h.clientQuery.mock.calls.filter(([sql])=>String(sql).includes('insert into assignment_questions'));
    const contextCalls=h.clientQuery.mock.calls.filter(([sql])=>String(sql).includes('insert into assignment_context_items'));
    expect(gradedCalls).toHaveLength(1);
    expect(contextCalls).toHaveLength(1);
    expect(gradedCalls[0]![1]).toEqual([
      'assignment-1','33333333-3333-4333-8333-333333333333',1,3,'9618/11/M/J/23 Q1(a)','Q1(a)',
    ]);
    expect(contextCalls[0]![1]).toEqual([
      'assignment-1','44444444-4444-4444-8444-444444444444',2,'9618/11/M/J/23 Q1(b)','Q1(b)',
    ]);
    expect(h.clientQuery).toHaveBeenCalledWith('commit');
  });

  it('refuses unresolved dependency reviews before opening a write transaction',async()=>{
    const h=harness({...goodReview,canPublish:false,dependencyIssues:[{
      code:'answer_dependency_requires_graded',severity:'error',questionId:'q',questionRef:'Q2',dependsOnId:'p',dependsOnRef:'Q1',evidence:'using your answer',
    }]});
    await expect(h.service.create(actor,selectionId,{classId,title:'Blocked'})).rejects.toMatchObject({code:'selection_dependencies_unresolved',status:409});
    expect(h.clientQuery).not.toHaveBeenCalled();
  });

  it('rolls back when the basket changes between review and row lock',async()=>{
    const h=harness(goodReview,new Date('2026-08-14T12:01:00Z'));
    await expect(h.service.create(actor,selectionId,{classId,title:'Race'})).rejects.toMatchObject({code:'selection_changed',status:409});
    expect(h.clientQuery).toHaveBeenCalledWith('rollback');
  });

  it('creates submissions only when an online/mock assignment is explicitly published',async()=>{
    const draft=harness();
    await draft.service.create(actor,selectionId,{classId,title:'Draft',publish:false});
    expect(draft.clientQuery.mock.calls.some(([sql])=>String(sql).includes('insert into submissions'))).toBe(false);

    const published=harness();
    await published.service.create(actor,selectionId,{classId,title:'Published',publish:true,mode:'online'});
    expect(published.clientQuery.mock.calls.some(([sql])=>String(sql).includes('insert into submissions'))).toBe(true);

    const pdf=harness();
    await pdf.service.create(actor,selectionId,{classId,title:'PDF',publish:true,mode:'pdf'});
    expect(pdf.clientQuery.mock.calls.some(([sql])=>String(sql).includes('insert into submissions'))).toBe(false);
  });
});
