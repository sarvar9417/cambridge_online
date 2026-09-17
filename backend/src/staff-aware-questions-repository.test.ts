import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PgStaffAwareQuestionsRepository } from './repositories/staff-aware-questions-repository.js';

const teacher = { id:'teacher',role:'teacher' as const,schoolId:'school',fullName:'Teacher' };
const student = { id:'student',role:'student' as const,schoolId:'school',fullName:'Student' };

const baseRow = {
  id:'q1',display_ref:'9618/41/O/N/25 Q1(a)',stem_md:'Question',context_md:null,
  command_word:'Explain',marks:2,ao:'AO2',answer_kind:'text',parent:null,
};

const portableLeafRow = {
  id:'q1',parent_id:null,label:'a',path:'Q1.a',display_ref:'9618/11/M/J/26 Q3(b)(i)',depth:0,
  marks:2,command_word:'Write',answer_kind:'text',answer_lines:2,stem:'Question',stem_latex:null,
  body_format:'markdown',context:null,context_latex:null,assets:[],
};
const assetId='11111111-1111-4111-8111-111111111111';
const paperId='22222222-2222-4222-8222-222222222222';
const otherPaperId='33333333-3333-4333-8333-333333333333';
const structuredContent={
  version:1,
  source:{paperId,sha256:'a'.repeat(64)},
  blocks:[{type:'asset',kind:'diagram',assetId,altText:'Shared source diagram',source:{page:2}}],
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

describe('staff portable structured asset closure',()=>{
  it('freezes an explicitly referenced sibling source asset into the portable snapshot',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[portableLeafRow]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:1,rows:[{content_json:structuredContent,content_version:1}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{
        id:assetId,kind:'diagram',storage_path:'9618/source/shared.png',content_md:'<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        alt_text:'Shared source diagram',sort_order:1,source_page:2,
        owner_source_paper_id:paperId,leaf_source_paper_id:paperId,
      }]});

    const result=await new PgStaffAwareQuestionsRepository({query} as unknown as Pool).portable(teacher,'q1');
    expect(result?.leaf.contentJson).toEqual(structuredContent);
    expect(result?.contextBlocks.flatMap(block=>block.assets).map(asset=>asset.id)).toContain(assetId);
    expect(result?.contextBlocks.at(-1)?.id).toBe('q1:structured-assets');
    expect(query).toHaveBeenCalledTimes(4);
    expect(String(query.mock.calls[3]?.[0])).toContain('owner.source_paper_id');
  });

  it('fails closed if an explicit structured asset belongs to another source paper',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rowCount:1,rows:[portableLeafRow]})
      .mockResolvedValueOnce({rowCount:0,rows:[]})
      .mockResolvedValueOnce({rowCount:1,rows:[{content_json:structuredContent,content_version:1}]})
      .mockResolvedValueOnce({rowCount:1,rows:[{
        id:assetId,kind:'diagram',storage_path:'9618/source/shared.png',content_md:null,
        alt_text:'Wrong paper diagram',sort_order:1,source_page:2,
        owner_source_paper_id:otherPaperId,leaf_source_paper_id:paperId,
      }]});

    await expect(new PgStaffAwareQuestionsRepository({query} as unknown as Pool).portable(teacher,'q1'))
      .rejects.toThrow('structured_question_asset_source_mismatch');
  });
});
