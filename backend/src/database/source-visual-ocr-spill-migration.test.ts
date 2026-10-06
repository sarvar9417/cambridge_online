import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0198_live_visual_ocr_spill_guard.sql',import.meta.url),
  'utf8',
);

describe('0198 source visual OCR spill guard',()=>{
  it('repairs the 2021 Paper 31 Q7 family from verified source text',()=>{
    expect(sql).toContain("9618/31/M/J/21 Q7(a)");
    expect(sql).toContain("9618/31/M/J/21 Q7(b)");
    expect(sql).toContain("9618/31/M/J/21 Q7(c)");
    expect(sql).toContain('The diagram shows a logic circuit.');
    expect(sql).toContain('source-visual-ocr-spill-cleanup-v1');
  });

  it('fails closed when short visual labels leak into canonical prose',()=>{
    expect(sql).toContain('flag_source_fidelity_requirements_v7');
    expect(sql).toContain("source_visual_ocr_spill");
    expect(sql).toContain("regexp_split_to_table");
    expect(sql).toContain("^[A-Z0-9]{1,3}$");
    expect(sql).toContain("SELECT public.flag_source_fidelity_requirements_v7");
  });
});
