import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0183_9618_2026_mj31_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0183 9618/31/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official syllabus',()=>{
    expect(sql).toContain('aeb56592086be4bf2918bac30449eb32255f9dc2328db2c1b53a23abc0725e94');
    expect(sql).toContain('4c0d7d6c55966d08b5a1ffdcdac31fb6907157f92d9535bb7317fad7a8894ece');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('corrects representative objective identities',()=>{
    for(const pair of [
      "('9618/31/M/J/26 Q1(a)','13.1.3')",
      "('9618/31/M/J/26 Q1(b)(i)','13.1.2')",
      "('9618/31/M/J/26 Q3(a)','13.3.2')",
      "('9618/31/M/J/26 Q6(a)','15.2.1')",
      "('9618/31/M/J/26 Q7(b)','16.2.4')",
      "('9618/31/M/J/26 Q9(b)','18.1.1')",
      "('9618/31/M/J/26 Q11(c)','20.1.1')",
    ]) expect(sql).toContain(pair);
  });

  it('captures hashing, TCP-IP, normalisation and complexity multi-objective evidence',()=>{
    expect(sql).toContain("('9618/31/M/J/26 Q2(b)','13.2.3')");
    expect(sql).toContain("('9618/31/M/J/26 Q2(c)','13.2.2')");
    expect(sql).toContain("('9618/31/M/J/26 Q4','14.1.2')");
    expect(sql).toContain("('9618/31/M/J/26 Q4','14.1.3')");
    expect(sql).toContain("('9618/31/M/J/26 Q10(c)','19.1.5')");
  });

  it('requires full closure',()=>{
    expect(sql).toContain("h.review_tag='manual-source-audit-0183-2026-mj31'");
    expect(sql).toContain('v_history<>28 OR v_edges<>34 OR v_primary<>28 OR v_low_p<>0 OR v_low_lo<>0');
  });

  it('does not rewrite source content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});