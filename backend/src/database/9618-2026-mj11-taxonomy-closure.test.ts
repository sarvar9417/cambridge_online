import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0177_9618_2026_mj11_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0177 9618/11/M/J/26 taxonomy closure',()=>{
  it('pins exact QP, MS and official 2026 syllabus evidence',()=>{
    expect(sql).toContain('17ad7576cf687fbcc3c8912523852e55a0836736b84077255c10d3e97a80a5d0');
    expect(sql).toContain('770b536d04daea335f382b7ec8a2ab69efc266d478b1b95fea25a2d0e1f8cf91');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
    expect(sql).toContain('v_questions<>29');
    expect(sql).toContain('v_lo_edges<>30');
  });

  it('corrects known false-positive LO identities',()=>{
    for(const triple of [
      "('9618/11/M/J/26 Q1(b)','1.1.7','1.1.3')",
      "('9618/11/M/J/26 Q2(b)','5.2.1','5.2.2')",
      "('9618/11/M/J/26 Q3(a)','4.2.5','4.2.4')",
      "('9618/11/M/J/26 Q3(b)(i)','4.3.2','4.3.3')",
      "('9618/11/M/J/26 Q3(b)(ii)','4.3.2','4.3.1')",
      "('9618/11/M/J/26 Q4(a)','8.1.4','8.1.3')",
      "('9618/11/M/J/26 Q4(b)','8.3.3','8.3.6')",
      "('9618/11/M/J/26 Q4(c)(i)','8.3.6','8.3.5')",
      "('9618/11/M/J/26 Q4(d)(i)','8.1.1','6.2.1')",
      "('9618/11/M/J/26 Q4(d)(ii)','8.1.1','6.2.1')",
      "('9618/11/M/J/26 Q5(a)','1.2.5','1.2.1')",
      "('9618/11/M/J/26 Q5(b)','1.2.5','1.2.4')",
    ]) expect(sql).toContain(triple);
  });

  it('moves the two validation/verification questions to Data Integrity 6.2',()=>{
    expect(sql).toContain("('9618/11/M/J/26 Q4(d)(i)','8.1','6.2'");
    expect(sql).toContain("('9618/11/M/J/26 Q4(d)(ii)','8.1','6.2'");
    expect(sql).toContain("new_st.code='6.2'");
  });

  it('requires zero low-confidence mappings after the repair',()=>{
    expect(sql).toContain('v_low_primary<>0');
    expect(sql).toContain('v_low_lo<>0');
    expect(sql).toContain("review_tag='manual-source-audit-0177-2026-mj11'");
  });

  it('does not rewrite source question/MS content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});
