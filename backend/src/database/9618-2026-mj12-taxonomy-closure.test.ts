import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0178_9618_2026_mj12_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0178 9618/12/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and the official 2026 syllabus',()=>{
    expect(sql).toContain('7f5625eb0e81c56fe770949a4254452f58753b92d6540c7b39cec031da448ffd');
    expect(sql).toContain('23703287e6f7f128e8176bad82b3f81d31cd602e7849107b3afcac026766fca2');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
    expect(sql).toContain('v_leaves<>28 OR v_lo_edges<>28');
  });

  it('records all 28 leaves and produces 31 reviewed LO edges',()=>{
    expect(sql).toContain("review_tag='manual-source-audit-0178-2026-mj12'");
    expect(sql).toContain('v_history<>28 OR v_edges<>31');
  });

  it('adds the legitimate multi-objective mappings',()=>{
    expect(sql).toContain("('9618/12/M/J/26 Q2(c)(i)','6.1.3')");
    expect(sql).toContain("('9618/12/M/J/26 Q2(c)(i)','6.1.4')");
    expect(sql).toContain("('9618/12/M/J/26 Q5(b)','1.1.2')");
    expect(sql).toContain("('9618/12/M/J/26 Q5(b)','4.3.1')");
  });

  it('moves Q5(b) primary mapping to bit manipulation',()=>{
    expect(sql).toContain("q.display_ref='9618/12/M/J/26 Q5(b)'");
    expect(sql).toContain("st.code='4.3'");
  });

  it('does not rewrite question or mark-scheme source content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});
