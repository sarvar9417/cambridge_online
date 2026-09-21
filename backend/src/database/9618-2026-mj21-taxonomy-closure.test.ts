import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0180_9618_2026_mj21_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0180 9618/21/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official syllabus',()=>{
    expect(sql).toContain('87fad77773dad215ca292585f721064bf754451299505e5cedba0953f27f5fe0');
    expect(sql).toContain('3f52bd3676a68f5f23a82704ef058528ca9c8387a4468cf80a15be19c5872795');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('fixes representative misclassified leaves',()=>{
    for(const pair of [
      "('9618/21/M/J/26 Q1(b)','11.2.1')",
      "('9618/21/M/J/26 Q2(a)(i)','10.1.1')",
      "('9618/21/M/J/26 Q2(a)(ii)','11.1.2')",
      "('9618/21/M/J/26 Q4','9.2.5')",
      "('9618/21/M/J/26 Q6(a)','11.1.3')",
      "('9618/21/M/J/26 Q7(b)(i)','10.4.5')",
      "('9618/21/M/J/26 Q8(a)','12.3.2')",
      "('9618/21/M/J/26 Q9(a)','10.2.3')",
      "('9618/21/M/J/26 Q9(c)(i)','10.1.3')",
    ]) expect(sql).toContain(pair);
  });

  it('records legitimate multi-objective coverage',()=>{
    expect(sql).toContain("('9618/21/M/J/26 Q3(b)','12.1.4')");
    expect(sql).toContain("('9618/21/M/J/26 Q3(b)','12.3.2')");
    expect(sql).toContain("('9618/21/M/J/26 Q3(b)','12.3.5')");
    expect(sql).toContain("('9618/21/M/J/26 Q9(c)(ii)','10.1.4')");
    expect(sql).toContain("('9618/21/M/J/26 Q9(c)(ii)','10.2.4')");
  });

  it('requires fully closed postconditions',()=>{
    expect(sql).toContain("h.review_tag='manual-source-audit-0180-2026-mj21'");
    expect(sql).toContain('v_history<>28 OR v_edges<>40 OR v_primary<>28 OR v_low_p<>0 OR v_low_lo<>0');
  });

  it('does not rewrite source question or mark-scheme content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});