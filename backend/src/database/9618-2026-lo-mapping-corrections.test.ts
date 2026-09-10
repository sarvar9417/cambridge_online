import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0163_9618_2026_lo_mapping_corrections.sql',import.meta.url),'utf8');

const corrections=[
  ['9618/11/M/J/26 Q6(a)','3.2.1','3.2.5'],
  ['9618/12/M/J/26 Q6(a)','3.1.8','3.1.2'],
  ['9618/12/M/J/26 Q8(a)','3.2.2','3.2.4'],
  ['9618/12/M/J/26 Q8(b)','3.2.6','3.2.5'],
  ['9618/13/M/J/26 Q2(a)','3.2.2','3.2.4'],
  ['9618/13/M/J/26 Q7(b)','3.1.8','4.3.2'],
  ['9618/13/M/J/26 Q8(a)','3.1.5','3.1.7'],
  ['9618/13/M/J/26 Q8(c)','3.1.3','3.1.4'],
] as const;

describe('0163 source-verified 9618 LO mapping corrections',()=>{
  it('moves only the eight adjudicated May/June 2026 Paper 1 mappings',()=>{
    for(const [ref,oldCode,newCode] of corrections){
      expect(sql).toContain(`('${ref}','${oldCode}','${newCode}')`);
    }
    expect(sql).toContain("s.code='9618'");
    expect(sql).toContain("sp.year=2026");
    expect(sql).toContain("sp.series='MJ'::exam_series");
    expect(sql).toContain('component.number=1');
    expect(sql).toContain("old_s.version_label='2026-2028'");
    expect(sql).toContain("new_s.version_label='2026-2028'");
  });

  it('is idempotent and preserves unrelated current-question mappings',()=>{
    expect(sql).toContain('DELETE FROM public.question_learning_objectives qlo');
    expect(sql).toContain('WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id;');
    expect(sql).toContain('ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;');
    expect(sql).toContain('SELECT question_id,new_lo_id,1.0 FROM resolved');
    expect(sql).not.toContain('DELETE FROM public.question_learning_objectives\nWHERE question_id');
  });

  it('removes the audited historical RAM-performance false positive',()=>{
    expect(sql).toContain("q.display_ref='9618/11/M/J/25 Q6(a)(ii)'");
    expect(sql).toContain("lo.code='3.1-lo-03'");
    expect(sql).toContain("lo_s.version_label='2024-2025'");
    expect(sql).toContain('v_bad_historical_mapping<>0');
  });

  it('enables only the cleaned historical RAM-vs-ROM compatibility pool',()=>{
    expect(sql).toContain("('3.1.5','3.1-lo-03','equivalent'");
    expect(sql).not.toContain("('3.1.6','3.1-lo-04','equivalent'");
    expect(sql).not.toContain("('3.1.7','3.1-lo-05','equivalent'");
    expect(sql).toContain("source_s.version_label IN ('2021-2023','2024-2025')");
    expect(sql).toContain("target_s.version_label='2026-2028'");
    expect(sql).toContain('chapter3-ram-rom-compatibility-0163');
    expect(sql).toContain('v_compatibility<>2');
  });

  it('fails closed when the expected corpus identity is not present',()=>{
    expect(sql).toContain('v_questions<>8');
    expect(sql).toContain('v_target_los<>12');
    expect(sql).toContain('v_historical_question<>1');
    expect(sql).toContain('v_new_mappings<>8 OR v_old_mappings<>0');
  });
});
