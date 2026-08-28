import{describe,expect,it,vi}from'vitest';import type{Pool}from'pg';import{PgQuestionsRepository}from'./repositories/questions-repository.js';
const teacher={id:'t',role:'teacher' as const,schoolId:'s',fullName:'Teacher'};
const student={id:'u',role:'student' as const,schoolId:'s',fullName:'Student'};
const owner={id:'o',role:'owner' as const,schoolId:'s',fullName:'Owner'};
describe('Question Bank review-gated visibility',()=>{
 it('lets staff search approved and needs_review without promoting either status',async()=>{const query=vi.fn().mockResolvedValue({rowCount:0,rows:[]});await new PgQuestionsRepository({query}as unknown as Pool).findVisible(teacher,{view:'parts'});expect(query.mock.calls[0]![0]).toContain("q.status in ('approved','needs_review')");});
 it('keeps students approved-only',async()=>{const query=vi.fn().mockResolvedValue({rowCount:0,rows:[]});await new PgQuestionsRepository({query}as unknown as Pool).findVisible(student,{view:'parts'});expect(query.mock.calls[0]![0]).toContain("q.status='approved'");expect(query.mock.calls[0]![0]).not.toContain("q.status in ('approved','needs_review')");});
 it('preserves the owner explicit review-status filter',async()=>{const query=vi.fn().mockResolvedValue({rowCount:0,rows:[]});await new PgQuestionsRepository({query}as unknown as Pool).findVisible(owner,{view:'parts',status:'needs_review'});const[sql,values]=query.mock.calls[0]!;expect(sql).toContain('q.status::text=');expect(values).toContain('needs_review');});
});
