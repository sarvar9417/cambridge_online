import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0176_9618_2025_taxonomy_closure.sql',import.meta.url),'utf8');

describe('0176 2025 9618 taxonomy closure',()=>{
  it('pins the three reviewed papers to exact QP/MS hashes',()=>{
    for(const hash of [
      '607722293452744ee7107b7365cac73664d51e0eb0f7487587d038e22467826e',
      '0b0c41c4a7930853aaaaa00729d4ffd3a3e971948800220344c6ae6a31ec957a',
      '1406c7743c70dd196c5ed82c533fb39dc124e13919d4e0c9efebb497460a04da',
      'cc0ce7f995d039ebed35955a41a87d3d09f6e25470afcf0868f8af897ac9486b',
      '598eed30b0b8138239f5173655d0579126227ea4d371402c9220e9b020c716ea',
      '13b90d3db85a32157de8c2c7af9dd35f4ee92157b8bd129566d895330f7de419',
    ]) expect(sql).toContain(hash);
    expect(sql).toContain('v_papers<>3');
  });

  it('reviews eleven questions and exactly twelve low LO edges',()=>{
    expect(sql).toContain('v_questions<>11');
    expect(sql).toContain('v_low_edges<>12');
    for(const ref of [
      '9618/12/M/J/25 Q5(c)(ii)',
      '9618/21/M/J/25 Q2(b)(i)',
      '9618/21/M/J/25 Q2(b)(iii)',
      '9618/21/M/J/25 Q3',
      '9618/23/M/J/25 Q1(a)(i)',
      '9618/23/M/J/25 Q1(a)(ii)',
      '9618/23/M/J/25 Q1(a)(iii)',
      '9618/23/M/J/25 Q1(b)',
      '9618/23/M/J/25 Q5',
      '9618/23/M/J/25 Q7(a)(ii)',
      '9618/23/M/J/25 Q7(b)(ii)',
    ]) expect(sql).toContain(ref);
  });

  it('preserves taxonomy identities and only promotes reviewed confidence',()=>{
    expect(sql).toContain("'taxonomy_identity_preserved',true");
    expect(sql).toContain("set_by='manual-source-audit-0176'");
    expect(sql).not.toContain('DELETE FROM public.question_learning_objectives');
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
  });

  it('requires zero remaining 2025 low-confidence taxonomy blockers',()=>{
    expect(sql).toContain('v_low_primary<>0 OR v_low_lo<>0');
    expect(sql).toContain("sp.year=2025");
    expect(sql).toContain("sy.version_label='2024-2025'");
  });

  it('writes durable source provenance',()=>{
    expect(sql).toContain("review_tag='manual-source-audit-0176-2025-closure'");
    expect(sql).toContain("'taxonomy_catalog','backend/src/database/catalogs/9618-2024-2025.json'");
  });
});
