import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0182_9618_2026_mj23_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0182 9618/23/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official syllabus',()=>{
    expect(sql).toContain('35035013960afd2e06405c857809e89bfdbf608845cac4c157ee6f8aca5b6a53');
    expect(sql).toContain('f6c81f545fdede64b39d2c1f6d42a5c04a644dd9778cc8aa17af84df7afe7711');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('corrects representative false-positive classifier mappings',()=>{
    for(const pair of [
      "('9618/23/M/J/26 Q1(b)','11.2.1')",
      "('9618/23/M/J/26 Q2(a)','10.1.1')",
      "('9618/23/M/J/26 Q2(d)(i)','12.3.1')",
      "('9618/23/M/J/26 Q4','9.2.5')",
      "('9618/23/M/J/26 Q6(a)','10.4.5')",
      "('9618/23/M/J/26 Q8(a)(i)','10.2.3')",
      "('9618/23/M/J/26 Q8(b)(i)','10.1.3')",
    ]) expect(sql).toContain(pair);
  });

  it('records source-supported multi-objective questions',()=>{
    expect(sql).toContain("('9618/23/M/J/26 Q3(a)','12.1.4')");
    expect(sql).toContain("('9618/23/M/J/26 Q3(a)','12.3.2')");
    expect(sql).toContain("('9618/23/M/J/26 Q3(a)','12.3.5')");
    expect(sql).toContain("('9618/23/M/J/26 Q5(b)','10.3.2')");
    expect(sql).toContain("('9618/23/M/J/26 Q5(b)','11.3.1')");
    expect(sql).toContain("('9618/23/M/J/26 Q8(b)(ii)','10.1.4')");
    expect(sql).toContain("('9618/23/M/J/26 Q8(b)(ii)','11.3.2')");
  });

  it('requires complete closure postconditions',()=>{
    expect(sql).toContain("h.review_tag='manual-source-audit-0182-2026-mj23'");
    expect(sql).toContain('v_history<>27 OR v_edges<>45 OR v_primary<>27 OR v_low_p<>0 OR v_low_lo<>0');
  });

  it('does not rewrite source question or mark-scheme content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});