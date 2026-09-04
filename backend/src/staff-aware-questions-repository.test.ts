import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PgStaffAwareQuestionsRepository } from './repositories/staff-aware-questions-repository.js';

const teacher = { id:'teacher',role:'teacher' as const,schoolId:'school',fullName:'Teacher' };
const student = { id:'student',role:'student' as const,schoolId:'school',fullName:'Student' };

const baseRow = {
  id:'q1',display_ref:'9618/41/O/N/25 Q1(a)',stem_md:'Question',context_md:null,
  command_word:'Explain',marks:2,ao:'AO2',answer_kind:'text',parent:null,
};

describe('staff mark-scheme fallback', () => {
  it('returns a needs-review source scheme to staff and prefers approved in SQL', async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount:1,
      rows:[{
        ...baseRow,
        can_view_scheme:true,
        mark_scheme:{ id:'ms-review',status:'needs_review',schemeType:'all_required',maxMarks:2,points:[],groups:[] },
      }],
    });

    const result = await new PgStaffAwareQuestionsRepository({ query } as unknown as Pool).findOne(teacher,'q1');
    expect(result).toHaveProperty('markScheme.id','ms-review');
    expect(result).toHaveProperty('markScheme.status','needs_review');

    const [sql,values] = query.mock.calls[0]!;
    expect(sql).toContain("ms.status='approved'");
    expect(sql).toContain("$2<>'student' and ms.status='needs_review'");
    expect(sql).toContain("order by case when ms.status='approved' then 0 else 1 end");
    expect(values).toEqual(['q1','teacher','teacher']);
  });

  it('keeps the needs-review fallback inaccessible to students', async () => {
    const query = vi.fn().mockResolvedValue({
      rowCount:1,
      rows:[{ ...baseRow,can_view_scheme:false,mark_scheme:null }],
    });

    const result = await new PgStaffAwareQuestionsRepository({ query } as unknown as Pool).findOne(student,'q1');
    expect(result).not.toHaveProperty('markScheme');

    const [sql,values] = query.mock.calls[0]!;
    expect(sql).toContain("$2<>'student' and ms.status='needs_review'");
    expect(sql).toContain("$2='student' and q.status='approved'");
    expect(sql).toContain('s.released_at is not null');
    expect(sql).toContain('a.published_at is not null');
    expect(values).toEqual(['q1','student','student']);
  });
});
