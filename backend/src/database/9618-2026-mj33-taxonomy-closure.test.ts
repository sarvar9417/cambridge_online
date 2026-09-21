import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0185_9618_2026_mj33_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0185 9618/33/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official syllabus',()=>{
    expect(sql).toContain('f23488a0b03097d8f4ea71e2bd527f412100bd339077600a35c19f67bd1f5014');
    expect(sql).toContain('fbd4b71ff8210b4f2a1c8b7e34974e9ef19d5fe6b28e14d1838a73a83aa874a7');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('corrects source-inconsistent objective identities',()=>{
    for(const pair of [
      "('9618/33/M/J/26 Q1(a)','13.1.1')",
      "('9618/33/M/J/26 Q1(b)','13.1.2')",
      "('9618/33/M/J/26 Q3(c)','13.2.2')",
      "('9618/33/M/J/26 Q5(b)','13.3.4')",
      "('9618/33/M/J/26 Q7(b)','16.2.4')",
      "('9618/33/M/J/26 Q8(b)','17.1.1')",
      "('9618/33/M/J/26 Q9(a)','18.1.5')",
      "('9618/33/M/J/26 Q10(a)(ii)','19.1.1')",
      "('9618/33/M/J/26 Q11(a)','20.1.1')",
    ]) expect(sql).toContain(pair);
  });

  it('keeps multi-objective evidence where the task genuinely spans objectives',()=>{
    expect(sql).toContain("('9618/33/M/J/26 Q5(a)','13.3.2')");
    expect(sql).toContain("('9618/33/M/J/26 Q5(a)','13.3.3')");
    expect(sql).toContain("('9618/33/M/J/26 Q6(b)','15.2.5')");
    expect(sql).toContain("('9618/33/M/J/26 Q6(b)','15.2.6')");
    expect(sql).toContain("('9618/33/M/J/26 Q10(b)','19.1.1')");
    expect(sql).toContain("('9618/33/M/J/26 Q10(b)','19.1.5')");
  });

  it('requires full closure and the quantum mapping',()=>{
    expect(sql).toContain("h.review_tag='manual-source-audit-0185-2026-mj33'");
    expect(sql).toContain('v_history<>26 OR v_edges<>29 OR v_primary<>26 OR v_low_p<>0 OR v_low_lo<>0 OR v_quantum<>2');
  });

  it('does not rewrite source question or mark-scheme content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});