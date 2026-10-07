import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./repairs/9618_12_mj25_q1a_semantic_table_repair.sql',import.meta.url),
  'utf8',
);

describe('9618/12/M/J/25 Q1(a) semantic table source repair',()=>{
  it('pins the exact verified source paper and source crop',()=>{
    expect(sql).toContain('9618/12/M/J/25 Q1(a)');
    expect(sql).toContain('607722293452744ee7107b7365cac73664d51e0eb0f7487587d038e22467826e');
    expect(sql).toContain("qa.source_page=2");
    expect(sql).toContain("qa.source_bbox='[153, 881, 1542, 2214]'::jsonb");
  });

  it('restores the canonical block sequence instead of flattened prose',()=>{
    expect(sql).toContain("'Statement number','Statement'");
    expect(sql).toContain("'Incorrect statement number','Corrected statement'");
    expect(sql).toContain('The Program Counter (PC) stores the next instruction to be fetched from memory.');
    expect(sql).toContain("'type','answer_area','kind','table_cells'");
    expect(sql).toContain("'blockSequence',jsonb_build_array('text','table','task','table','answer_area')");
  });

  it('does not encode the three correct answer choices into learner-facing content',()=>{
    expect(sql).not.toContain('incorrect statements are');
    expect(sql).not.toContain('answers:');
  });
});
