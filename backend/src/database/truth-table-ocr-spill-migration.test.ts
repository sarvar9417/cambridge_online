import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration199=readFileSync(
  new URL('./migrations/0199_live_binary_table_ocr_spill_guard.sql',import.meta.url),
  'utf8',
);
const migration200=readFileSync(
  new URL('./migrations/0200_source_table_preceding_visual_reconcile.sql',import.meta.url),
  'utf8',
);

describe('truth-table OCR spill source-fidelity migrations',()=>{
  it('repairs the verified 2023 Paper 32 Q9 family using source-backed assets',()=>{
    expect(migration199).toContain('9618/32/M/J/23 Q9(a)');
    expect(migration199).toContain('9618/32/M/J/23 Q9(e)');
    expect(migration199).toContain('truth-table-ocr-spill-cleanup-v1');
    expect(migration199).toContain('source_table_ocr_spill');
    expect(migration199).toContain('source-fidelity-0199');
  });

  it('reconciles valid table-before-task source ordering without weakening the spill guard',()=>{
    expect(migration200).toContain('source_structure_required_but_missing_table');
    expect(migration200).toContain('prev.ordinality');
    expect(migration200).toContain('source_table_ocr_spill');
    expect(migration200).toContain('binaryTableSpillQuestions');
  });
});
