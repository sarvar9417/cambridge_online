import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0165_chapter2_past_paper_taxonomy_reconciliation.sql',import.meta.url),'utf8');

const currentCorrections=[
  ['9618/13/M/J/26 Q3(c)(ii)','2.1.13','2.1.6'],
  ['9618/12/M/J/26 Q6(d)','2.1.14','2.1.6'],
  ['9618/13/M/J/26 Q3(c)(iii)','2.1.14','2.1.6'],
  ['9618/11/M/J/26 Q7(a)','2.1.2','2.1.4'],
  ['9618/11/M/J/26 Q7(b)(i)','2.1.2','2.1.5'],
  ['9618/11/M/J/26 Q7(b)(ii)','2.1.2','2.1.5'],
  ['9618/11/M/J/26 Q7(c)(i)','2.1.2','2.1.14'],
  ['9618/11/M/J/26 Q7(c)(ii)','2.1.2','2.1.14'],
] as const;

const historicalCorrections=[
  ['9618/12/O/N/22 Q10(b)(i)','2.1-lo-08','2.1-lo-11'],
  ['9618/11/M/J/21 Q4(c)(ii)','2.1-lo-13','2.1-lo-10'],
  ['9618/12/O/N/21 Q3(b)(ii)','2.1-lo-12','2.1-lo-13'],
  ['9618/12/O/N/22 Q10(b)(ii)','2.1-lo-17','2.1-lo-13'],
  ['9618/12/M/J/23 Q1(e)','2.1-lo-17','2.1-lo-05'],
] as const;

describe('0165 Chapter 2 Past Paper taxonomy reconciliation',()=>{
  it('moves the eight adjudicated 2026 mappings to source-grounded current targets',()=>{
    for(const [ref,oldCode,newCode] of currentCorrections){
      expect(sql).toContain(`('${ref}','${oldCode}','${newCode}')`);
    }
    expect(sql).toContain("sp.year=2026");
    expect(sql).toContain("sp.series='MJ'::exam_series");
    expect(sql).toContain("old_s.version_label='2026-2028'");
    expect(sql).toContain("new_s.version_label='2026-2028'");
    expect(sql).toContain('v_current_new<>8 OR v_current_old<>0');
  });

  it('keeps the mixed bus/Ethernet question on both exact current objectives',()=>{
    expect(sql).toContain("q.display_ref='9618/11/M/J/26 Q7(b)(i)'");
    expect(sql).toContain("lo.code='2.1.10'");
    expect(sql).toContain("lo.code IN ('2.1.5','2.1.10')");
    expect(sql).toContain('v_mixed_dual<>2');
  });

  it('cleans the five historical mappings that contaminate audited compatibility pools',()=>{
    for(const [ref,oldCode,newCode] of historicalCorrections){
      expect(sql).toContain(`('${ref}','${oldCode}','${newCode}')`);
    }
    expect(sql).toContain("old_s.version_label='2021-2023'");
    expect(sql).toContain("new_s.version_label='2021-2023'");
    expect(sql).toContain('v_historical_new<>5 OR v_historical_old<>0');
  });

  it('adds only the source-audited historical compatibility set',()=>{
    [
      "('2.1.1','2.1-lo-01','equivalent'",
      "('2.1.3','2.1-lo-05','subtopic_compatible'",
      "('2.1.5','2.1-lo-08','equivalent'",
      "('2.1.6','2.1-lo-04','equivalent'",
      "('2.1.7','2.1-lo-09','subtopic_compatible'",
      "('2.1.7','2.1-lo-10','subtopic_compatible'",
      "('2.1.8','2.1-lo-11','subtopic_compatible'",
      "('2.1.8','2.1-lo-12','subtopic_compatible'",
      "('2.1.9','2.1-lo-13','equivalent'",
      "('2.1.10','2.1-lo-14','equivalent'",
      "('2.1.11','2.1-lo-20','equivalent'",
      "('2.1.12','2.1-lo-15','equivalent'",
      "('2.1.14','2.1-lo-17','equivalent'",
      "('2.1.15','2.1-lo-19','subtopic_compatible'",
    ].forEach(edge=>expect(sql).toContain(edge));
    expect(sql).toContain('chapter2-compatibility-0165-audited:');
    expect(sql).toContain('v_edges<>27');
  });

  it('keeps unresolved historical pools out of compatibility expansion',()=>{
    expect(sql).not.toContain("('2.1.2','2.1-lo-02'");
    expect(sql).not.toContain("('2.1.2','2.1-lo-03'");
    expect(sql).not.toContain("('2.1.13','2.1-lo-16'");
  });

  it('is idempotent and only replaces named objective edges',()=>{
    expect(sql).toContain('ON CONFLICT(question_id,lo_id) DO UPDATE SET confidence=EXCLUDED.confidence;');
    expect(sql).toContain('ON CONFLICT(target_lo_id,source_lo_id) DO UPDATE');
    expect(sql).toContain('WHERE qlo.question_id=r.question_id AND qlo.lo_id=r.old_lo_id');
  });
});
