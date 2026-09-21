import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0188_9618_2026_mj43_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0188 9618/43/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official syllabus',()=>{
    expect(sql).toContain('b85f57405cfce6bf8d70da1fe446437656f3f81b573e95c911a9e04f257d09eb');
    expect(sql).toContain('6892b35db63ca96ce19ebfd39922c4f8244fc7e924e0d5d84272eba422299dec');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('moves generic array procedures out of false file/ADT objectives',()=>{
    expect(sql).toContain("('9618/43/M/J/26 Q1(a)','20.1')");
    expect(sql).toContain("('9618/43/M/J/26 Q1(e)','20.1.1')");
  });

  it('maps bubble sort continuation to 19.1.2',()=>{
    expect(sql).toContain("('9618/43/M/J/26 Q1(f)(i)','19.1.2')");
    expect(sql).toContain("('9618/43/M/J/26 Q1(f)(ii)','19.1.2')");
    expect(sql).toContain("('9618/43/M/J/26 Q1(f)(iii)','19.1.2')");
  });

  it('maps file loading with exception handling to both 20.2 objectives',()=>{
    expect(sql).toContain("('9618/43/M/J/26 Q2(b)','20.2.1')");
    expect(sql).toContain("('9618/43/M/J/26 Q2(b)','20.2.4')");
    expect(sql).toContain("('9618/43/M/J/26 Q2(d)(i)','20.2.1')");
  });

  it('separates binary-tree implementation, insertion and recursion',()=>{
    expect(sql).toContain("('9618/43/M/J/26 Q3(a)','19.1.4')");
    expect(sql).toContain("('9618/43/M/J/26 Q3(b)','19.1.3')");
    expect(sql).toContain("('9618/43/M/J/26 Q3(e)(i)','19.2.1')");
    expect(sql).toContain("('9618/43/M/J/26 Q3(e)(ii)','19.2.1')");
  });

  it('requires full closure and preserves source content',()=>{
    expect(sql).toContain("h.review_tag='manual-source-audit-0188-2026-mj43'");
    expect(sql).toContain('v_history<>25 OR v_edges<>26 OR v_primary<>25 OR v_low_p<>0 OR v_low_lo<>0');
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});