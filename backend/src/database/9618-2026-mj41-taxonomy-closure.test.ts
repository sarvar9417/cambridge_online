import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0186_9618_2026_mj41_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0186 9618/41/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official syllabus',()=>{
    expect(sql).toContain('da482500bff5415dac950a5ed127eeb8ec760bb738da4c146d08b73ef057ec4b');
    expect(sql).toContain('16b8a6e3a0db965cf92180095778335e3d71b38421608cf2345bd7ae729db365');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('separates queue implementation from queue operations',()=>{
    expect(sql).toContain("('9618/41/M/J/26 Q1(a)','19.1.4')");
    expect(sql).toContain("('9618/41/M/J/26 Q1(b)','19.1.3')");
    expect(sql).toContain("('9618/41/M/J/26 Q1(d)','19.1.3')");
  });

  it('maps file+exception tasks to both objectives',()=>{
    expect(sql).toContain("('9618/41/M/J/26 Q2(b)(i)','20.2.1')");
    expect(sql).toContain("('9618/41/M/J/26 Q2(b)(i)','20.2.4')");
    expect(sql).toContain("('9618/41/M/J/26 Q2(c)(ii)','20.2.1')");
    expect(sql).toContain("('9618/41/M/J/26 Q2(c)(ii)','20.2.4')");
  });

  it('moves non-file array/search code out of 20.2',()=>{
    expect(sql).toContain("('9618/41/M/J/26 Q2(b)(ii)','20.1')");
    expect(sql).toContain("('9618/41/M/J/26 Q2(c)(i)','20.1')");
    expect(sql).toContain("('9618/41/M/J/26 Q2(c)(i)','20.1.1')");
  });

  it('requires closed postconditions and preserves source content',()=>{
    expect(sql).toContain("h.review_tag='manual-source-audit-0186-2026-mj41'");
    expect(sql).toContain('v_history<>23 OR v_edges<>25 OR v_primary<>23 OR v_low_p<>0 OR v_low_lo<>0');
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});