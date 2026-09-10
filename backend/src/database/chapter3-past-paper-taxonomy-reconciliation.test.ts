import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0164_chapter3_past_paper_taxonomy_reconciliation.sql',import.meta.url),'utf8');

const currentCorrections=[
  ['9618/11/M/J/26 Q6(a)','3.2.1','3.2.5'],
  ['9618/12/M/J/26 Q6(a)','3.1.8','3.1.2'],
  ['9618/12/M/J/26 Q8(a)','3.2.2','3.2.4'],
  ['9618/12/M/J/26 Q8(b)','3.2.6','3.2.5'],
  ['9618/13/M/J/26 Q2(a)','3.2.2','3.2.4'],
  ['9618/13/M/J/26 Q7(b)','3.1.8','4.3.2'],
  ['9618/13/M/J/26 Q8(a)','3.1.5','3.1.7'],
  ['9618/13/M/J/26 Q8(c)','3.1.3','3.1.4'],
] as const;

const historicalCleanup=[
  ['9618/11/M/J/25 Q6(a)(ii)','3.1-lo-03'],
  ['9618/12/M/J/22 Q9(b)','3.1-lo-05'],
  ['9618/12/O/N/22 Q3(c)','3.1-lo-05'],
  ['9618/13/O/N/22 Q4(b)','3.1-lo-05'],
  ['9618/12/O/N/23 Q1(c)(i)','3.1-lo-05'],
  ['9618/13/O/N/25 Q7(d)','3.1-lo-05'],
] as const;

describe('0164 Chapter 3 Past Paper taxonomy reconciliation',()=>{
  it('moves the eight adjudicated 2026 mappings to exact current targets',()=>{
    for(const [ref,oldCode,newCode] of currentCorrections){
      expect(sql).toContain(`('${ref}','${oldCode}','${newCode}')`);
    }
    expect(sql).toContain("sp.year=2026");
    expect(sql).toContain("sp.series='MJ'::exam_series");
    expect(sql).toContain("old_s.version_label='2026-2028'");
    expect(sql).toContain("new_s.version_label='2026-2028'");
    expect(sql).toContain('v_new_current<>8 OR v_old_current<>0');
  });

  it('removes the audited historical false positives without deleting unrelated mappings',()=>{
    for(const [ref,oldCode] of historicalCleanup){
      expect(sql).toContain(`('${ref}','${oldCode}')`);
    }
    expect(sql).toContain('DELETE FROM public.question_learning_objectives qlo');
    expect(sql).toContain('WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id;');
    expect(sql).not.toContain('DELETE FROM public.question_learning_objectives\nWHERE question_id');
    expect(sql).toContain('v_bad_historical<>0');
  });

  it('moves the generic 2022 ROM question into the historical RAM/ROM objective',()=>{
    expect(sql).toContain("q.display_ref='9618/12/O/N/22 Q3(c)'");
    expect(sql).toContain("target_lo.code='3.1-lo-03'");
    expect(sql).toContain("target_s.version_label='2021-2023'");
    expect(sql).toContain('v_rom_reclassified<>1');
  });

  it('retains only explicitly audited Chapter 3 memory compatibility provenance',()=>{
    for(const edge of [
      "('3.1.5','3.1-lo-03','equivalent'",
      "('3.1.6','3.1-lo-04','equivalent'",
      "('3.1.7','3.1-lo-05','equivalent'",
    ])expect(sql).toContain(edge);
    expect(sql).toContain('chapter3-memory-compatibility-0164-audited:');
    expect(sql).toContain('v_expected_rom_family<>6');
    expect(sql).toContain('v_compatibility<>6');
  });

  it('is idempotent and fails closed on taxonomy drift',()=>{
    expect(sql).toContain('ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;');
    expect(sql).toContain('ON CONFLICT(target_lo_id,source_lo_id) DO UPDATE');
    expect(sql).toContain('v_current_questions<>8');
    expect(sql).toContain('v_current_los<>12');
    expect(sql).toContain('v_historical_questions<>6');
  });
});
