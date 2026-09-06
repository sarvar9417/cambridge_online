import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PgStaffAwareQuestionsRepository } from './repositories/staff-aware-questions-repository.js';

const teacher={id:'00000000-0000-4000-8000-000000000001',role:'teacher' as const,schoolId:'00000000-0000-4000-8000-000000000002'};

describe('Lesson Studio mark-scheme trust contract',()=>{
  it('requests level descriptors and latest source-audit evidence for staff detail',async()=>{
    const query=vi.fn(async(sql:string)=>{
      expect(sql).toContain("'levels'");
      expect(sql).toContain('mark_scheme_levels');
      expect(sql).toContain("'sourceAudit'");
      expect(sql).toContain('mark_scheme_source_audits');
      expect(sql).toContain("ms.status='needs_review'");
      return {rows:[{
        id:'q1',display_ref:'9618/11/O/N/21 Q1(c)',stem_md:'Question',context_md:null,
        content_json:null,content_version:null,command_word:null,marks:1,ao:null,answer_kind:'text',parent:null,
        can_view_scheme:true,
        mark_scheme:{
          id:'ms1',status:'needs_review',schemeType:'all_required',maxMarks:1,guidanceMd:null,
          points:[],groups:[],levels:[],sourceAudit:{result:'needs_review',evidence:{strict:false}},
        },
      }]};
    });
    const result=await new PgStaffAwareQuestionsRepository({query} as unknown as Pool).findOne(teacher,'q1');
    expect(query).toHaveBeenCalledOnce();
    expect(result).toHaveProperty('markScheme.status','needs_review');
    expect(result).toHaveProperty('markScheme.sourceAudit.result','needs_review');
    expect(result).toHaveProperty('markScheme.levels');
  });
});
