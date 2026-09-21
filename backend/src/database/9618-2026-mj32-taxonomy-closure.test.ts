import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0184_9618_2026_mj32_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0184 9618/32/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official syllabus',()=>{
    expect(sql).toContain('b8977524b1dba38869c69e6290a3647d644f7a4ae450f7ae5eff29fe569751fb');
    expect(sql).toContain('711360ab6d0a366f9cb2d5143695c106a3a4879b7f41d97773be5223c059aa4d');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('corrects representative objective identities',()=>{
    for(const pair of [
      "('9618/32/M/J/26 Q1(a)','13.1.2')",
      "('9618/32/M/J/26 Q3(b)','13.3.4')",
      "('9618/32/M/J/26 Q4(c)','13.2.2')",
      "('9618/32/M/J/26 Q6(b)','16.2.4')",
      "('9618/32/M/J/26 Q7(a)(i)','15.2.8')",
      "('9618/32/M/J/26 Q9(b)(i)','18.1.1')",
      "('9618/32/M/J/26 Q10(b)','20.2.1')",
    ]) expect(sql).toContain(pair);
  });

  it('keeps source-supported multi-objective mappings',()=>{
    expect(sql).toContain("('9618/32/M/J/26 Q2','14.1.2')");
    expect(sql).toContain("('9618/32/M/J/26 Q2','14.1.3')");
    expect(sql).toContain("('9618/32/M/J/26 Q7(b)','15.2.5')");
    expect(sql).toContain("('9618/32/M/J/26 Q7(b)','15.2.6')");
    expect(sql).toContain("('9618/32/M/J/26 Q10(a)','19.1.1')");
    expect(sql).toContain("('9618/32/M/J/26 Q10(a)','19.1.5')");
  });

  it('moves direct random-file code to File Processing',()=>{
    expect(sql).toContain("('9618/32/M/J/26 Q10(b)','20.2')");
    expect(sql).toContain("v_q10b<>1");
  });

  it('requires full closure without rewriting source content',()=>{
    expect(sql).toContain("h.review_tag='manual-source-audit-0184-2026-mj32'");
    expect(sql).toContain('v_history<>26 OR v_edges<>29 OR v_primary<>26 OR v_low_p<>0 OR v_low_lo<>0 OR v_q10b<>1');
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});