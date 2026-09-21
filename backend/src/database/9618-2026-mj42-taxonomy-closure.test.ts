import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0187_9618_2026_mj42_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0187 9618/42/M/J/26 taxonomy closure',()=>{
  it('pins exact QP/MS and official syllabus',()=>{
    expect(sql).toContain('ead73d2f389cd10d7e25b16488b7dbb8744a159fc726dbc910c6684d01c48210');
    expect(sql).toContain('3fca3093a0d5631552eb8edecdac406850f26526b4624dd0979f50dbcbc137dd');
    expect(sql).toContain('1PvTiGuvynVCkW283YHHIRA5UZGjRrDRw');
  });

  it('moves generic string-array work out of false algorithm objectives',()=>{
    expect(sql).toContain("('9618/42/M/J/26 Q1(b)(ii)','20.1')");
    expect(sql).toContain("('9618/42/M/J/26 Q1(b)(ii)','20.1.1')");
    expect(sql).toContain("('9618/42/M/J/26 Q1(b)(iii)','20.1.1')");
  });

  it('maps insertion-sort tasks to 19.1.2',()=>{
    expect(sql).toContain("('9618/42/M/J/26 Q1(c)(i)','19.1.2')");
    expect(sql).toContain("('9618/42/M/J/26 Q1(c)(ii)','19.1.2')");
    expect(sql).toContain("('9618/42/M/J/26 Q1(c)(iii)','19.1.2')");
  });

  it('captures file processing plus exception handling',()=>{
    expect(sql).toContain("('9618/42/M/J/26 Q2(b)(i)','20.2.1')");
    expect(sql).toContain("('9618/42/M/J/26 Q2(b)(i)','20.2.4')");
    expect(sql).toContain("('9618/42/M/J/26 Q2(b)(ii)','20.2.1')");
  });

  it('separates linked-list implementation from insertion',()=>{
    expect(sql).toContain("('9618/42/M/J/26 Q3(a)','19.1.4')");
    expect(sql).toContain("('9618/42/M/J/26 Q3(b)(i)','19.1.4')");
    expect(sql).toContain("('9618/42/M/J/26 Q3(c)(i)','19.1.3')");
  });

  it('requires full closure and preserves source content',()=>{
    expect(sql).toContain("h.review_tag='manual-source-audit-0187-2026-mj42'");
    expect(sql).toContain('v_history<>24 OR v_edges<>25 OR v_primary<>24 OR v_low_p<>0 OR v_low_lo<>0');
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('stem_latex=');
    expect(sql).not.toContain('stem_md=');
  });
});