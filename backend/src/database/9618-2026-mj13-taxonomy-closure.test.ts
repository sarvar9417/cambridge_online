import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0179_9618_2026_mj13_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0179 9618/13/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official 2026 syllabus',()=>{
    expect(sql).toContain('7765f3cbe5a098ad57f7ace8396a02f5cc1c979e6bd7b72d7248bb36a79de817');
    expect(sql).toContain('6f0e5cccc1c236715d60544e058e3620c96e0e29bc51d60c271622c3927ddbcb');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('records all leaves and exact reviewed objectives',()=>{
    expect(sql).toContain("review_tag='manual-source-audit-0179-2026-mj13'");
    expect(sql).toContain("('9618/13/M/J/26 Q1','6.2.2')");
    expect(sql).toContain("('9618/13/M/J/26 Q1','6.2.3')");
    expect(sql).toContain("('9618/13/M/J/26 Q4(a)','8.1.7')");
    expect(sql).toContain("('9618/13/M/J/26 Q4(b)','8.1.3')");
    expect(sql).toContain("('9618/13/M/J/26 Q5(c)(i)','5.1.4')");
    expect(sql).toContain("('9618/13/M/J/26 Q6(a)','1.1.3')");
  });

  it('moves bit-manipulation leaves to 4.3',()=>{
    expect(sql).toContain("('9618/13/M/J/26 Q7(b)','4.3.2')");
    expect(sql).toContain("('9618/13/M/J/26 Q7(c)','4.3.1')");
    expect(sql).toContain("st.code='4.3'");
  });

  it('requires closed postconditions',()=>{
    expect(sql).toContain('v_history<>29 OR v_edges<>30');
    expect(sql).toContain('v_low_p<>0 OR v_low_lo<>0 OR v_bad<>0');
  });

  it('does not rewrite question or mark-scheme content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});