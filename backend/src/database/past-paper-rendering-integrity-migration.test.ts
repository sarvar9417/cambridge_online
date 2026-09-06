import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0122_past_paper_structured_rendering_integrity.sql',import.meta.url),'utf8');

describe('0122 past-paper structured rendering integrity',()=>{
  it('pins every repaired question to the exact Cambridge source identity',()=>{
    for(const ref of [
      '9618/11/M/J/25 Q8(a)',
      '9618/31/M/J/25 Q5(b)(i)',
      '9618/33/M/J/25 Q3(b)(i)',
      '9618/33/M/J/25 Q13',
      '9618/32/M/J/25 Q7(a)',
      '9618/31/M/J/25 Q11(a)',
      '9618/32/M/J/25 Q12(a)',
    ]) expect(sql).toContain(ref);
    expect(sql).toContain('bdf74d4f15c620bde7e6fe65f17828bc85c89490ebb9a1a337e2cd0596f4b39a');
    expect(sql).toContain('68475c1640b44518f74a6756b7895f81f0e9557f87ab1d97cdea832e83eea5e4');
    expect(sql).toContain('137f265e230d601b039f2be2fa996b93b3ae703e8c6e23b6387b5400d0c3a086');
    expect(sql).toContain('647369ebfe2214f7b00ee4091d67d8ebe3f00c25dd73338e469d4184842e1be7');
  });

  it('reconstructs high-value Cambridge geometry as semantic blocks',()=>{
    expect(sql.match(/\"kind\":\"k_map\"/g)).toHaveLength(2);
    expect(sql.match(/\"kind\":\"trace_table\"/g)).toHaveLength(2);
    expect(sql).toContain('\"kind\":\"truth_table\"');
    expect(sql).toContain('\"kind\":\"logic_circuit\"');
    expect(sql).toContain('\"kind\":\"drawing\"');
    expect(sql).toContain('\"language\":\"pseudocode\"');
  });

  it('uses the guarded source writer and leaves approval decisions untouched',()=>{
    expect(sql.match(/set_question_structured_content_v1/g)?.length).toBeGreaterThanOrEqual(7);
    expect(sql).not.toMatch(/SET\s+status\s*=/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.question_assets/i);
  });

  it('fails the migration if an approved non-renderable table asset survives',()=>{
    expect(sql).toContain("q.status='approved'");
    expect(sql).toContain("qa.kind='table'");
    expect(sql).toContain('approved questions still contain non-renderable table asset blocks');
    expect(sql).toContain('K-map repair count mismatch');
    expect(sql).toContain('trace-table repair count mismatch');
  });
});
