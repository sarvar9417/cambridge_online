import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0181_9618_2026_mj22_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0181 9618/22/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official 2026 syllabus',()=>{
    expect(sql).toContain('8940a2df58113958b5da471ad6536f59231eb9326201ad5bc5e91f552342ede6');
    expect(sql).toContain('2503ec94e75a2a8b328443d353a7c84cb49b072a6dd480145bf428859dc8fdae');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('corrects representative classifier misses',()=>{
    for(const pair of [
      "('9618/22/M/J/26 Q1(a)(i)','11.1.2')",
      "('9618/22/M/J/26 Q1(b)(ii)','12.2.2')",
      "('9618/22/M/J/26 Q2(b)','9.1.1')",
      "('9618/22/M/J/26 Q3','9.2.5')",
      "('9618/22/M/J/26 Q4(a)','10.4.4')",
      "('9618/22/M/J/26 Q5(a)','10.2.4')",
      "('9618/22/M/J/26 Q5(c)(i)','11.3.6')",
      "('9618/22/M/J/26 Q6(b)(i)','10.2.3')",
    ]) expect(sql).toContain(pair);
  });

  it('records legitimate multi-objective programming coverage',()=>{
    expect(sql).toContain("('9618/22/M/J/26 Q1(a)(iii)','11.1.2')");
    expect(sql).toContain("('9618/22/M/J/26 Q1(a)(iii)','11.1.3')");
    expect(sql).toContain("('9618/22/M/J/26 Q1(a)(iii)','11.2.1')");
    expect(sql).toContain("('9618/22/M/J/26 Q6(b)(ii)','10.2.4')");
    expect(sql).toContain("('9618/22/M/J/26 Q6(b)(ii)','11.3.1')");
    expect(sql).toContain("('9618/22/M/J/26 Q6(b)(ii)','11.3.6')");
  });

  it('requires fully closed postconditions',()=>{
    expect(sql).toContain("h.review_tag='manual-source-audit-0181-2026-mj22'");
    expect(sql).toContain('v_history<>24 OR v_edges<>34 OR v_primary<>24 OR v_low_p<>0 OR v_low_lo<>0');
  });

  it('does not rewrite source question or mark-scheme content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});