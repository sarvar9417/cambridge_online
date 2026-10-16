import {describe,expect,it} from 'vitest';
import {
  LIVE_IGCSE_PAPER2_SECTIONS,LIVE_IGCSE_PAPER2_SECTION_CODES,
  liveIgcseBookQuestionFilter,resolveIgcseBookSections,
} from './live-igcse-coursebook-sections.js';

describe('2021 Hodder IGCSE Paper 2 book taxonomy',()=>{
  it('reproduces exactly the source book four chapters and sixteen numbered sections',()=>{
    expect(LIVE_IGCSE_PAPER2_SECTIONS.map(s=>s.code)).toEqual([
      '7.1','7.2','7.3','7.4','7.5','7.6','7.7','7.8','7.9',
      '8.1','8.2','8.3','9.1','10.1','10.2','10.3',
    ]);
    expect([...new Set(LIVE_IGCSE_PAPER2_SECTIONS.map(s=>s.chapterNumber))]).toEqual([7,8,9,10]);
    expect(LIVE_IGCSE_PAPER2_SECTIONS.find(s=>s.code==='7.7')?.title)
      .toBe('Trace tables to document dry runs of algorithms');
    expect(LIVE_IGCSE_PAPER2_SECTIONS.find(s=>s.code==='10.3')?.sourcePage).toBe(360);
    expect(LIVE_IGCSE_PAPER2_SECTIONS.every(s=>s.mappingKind==='learning_objective_bridge')).toBe(true);
  });
  it('maps distinct 7.x and 10.x book sections to their corresponding official LOs, not whole chapters',()=>{
    expect(resolveIgcseBookSections(['7.7'])[0]?.loCodes).toEqual(['7-lo-07']);
    expect(resolveIgcseBookSections(['10.1'])[0]?.loCodes).toEqual(['10-lo-01']);
    expect(resolveIgcseBookSections(['10.3'])[0]?.loCodes).toEqual(['10-lo-03']);
    expect(resolveIgcseBookSections(['8.2'])[0]?.loCodes).toEqual(['8.2-lo-01','8.2-lo-02','8.2-lo-03']);
    expect(resolveIgcseBookSections(['9.1'])[0]?.loCodes).toHaveLength(4);
  });
  it('constructs a parameterized SQL filter against the question source syllabus, not unrelated 9618 class taxonomy',()=>{
    const values:unknown[]=['class-uuid'];
    const predicate=liveIgcseBookQuestionFilter(values,['7.7','8.2'],'q');
    expect(predicate).toContain('book_qlo.question_id=q.id');
    expect(predicate).toContain("book_sy.code='0478'");
    expect(predicate).toContain('book_sy.valid_from>=2023');
    expect(predicate).toContain('book_topic.syllabus_id=(');
    expect(predicate).toContain('book_lo.code=any($2::text[])');
    expect(values[1]).toEqual(['7-lo-07','8.2-lo-01','8.2-lo-02','8.2-lo-03']);
    expect(LIVE_IGCSE_PAPER2_SECTION_CODES.has('6.1')).toBe(false);
  });
  it('does not silently treat unverified 2015 syllabus LOs as matching 2021 book sections',()=>{
    const values:unknown[]=[];
    const sql=liveIgcseBookQuestionFilter(values,['7.1'],'q');
    expect(sql).toContain('book_sy.valid_from>=2023');
    expect(values).toEqual([['7-lo-01']]);
    expect(()=>resolveIgcseBookSections(['7.10'])).toThrow('Unknown IGCSE coursebook section');
    expect(liveIgcseBookQuestionFilter(values,[])).toBe('');
  });
});
