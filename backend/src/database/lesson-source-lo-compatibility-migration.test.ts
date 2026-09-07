import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0132_lesson_source_lo_compatibility_completion.sql',import.meta.url),'utf8');

describe('0132 lesson-source LO compatibility completion',()=>{
  it('completes the missing 9618 Chapter 1 and 13 current-to-historical edges',()=>{
    [
      "('1.1.3','1.1-lo-01','equivalent'",
      "('1.1.5','1.1-lo-02','subtopic_compatible'",
      "('1.1.7','1.1-lo-05','subtopic_compatible'",
      "('1.2.4','1.2-lo-02','equivalent'",
      "('1.2.6','1.2-lo-04','equivalent'",
      "('13.1.1','13.1-lo-01','equivalent'",
      "('13.1.2','13.1-lo-02','equivalent'",
      "('13.3.4','13.3-lo-04','equivalent'",
      "('13.3.5','13.3-lo-05','equivalent'",
    ].forEach(pair=>expect(sql).toContain(pair));
    expect(sql).toContain("target_s.code='9618' AND target_s.version_label='2026-2028'");
    expect(sql).toContain("source_s.version_label IN ('2021-2023','2024-2025')");
    expect(sql).toContain('v_9618_targets<>29');
    expect(sql).toContain('lesson-source-compatibility-0132');
  });

  it('maps 0478 current Topic 7 through explicit historical compatibility',()=>{
    expect(sql).toContain("target_s.code='0478' AND target_s.version_label='2026-2028'");
    expect(sql).not.toContain("source_s.version_label='0478'");
    expect(sql).toContain("source_s.code='0478' AND source_s.version_label='2015-2022'");
    [
      "('7-lo-03','2.1.1-lo-03','equivalent'",
      "('7-lo-05','2.1.1-lo-06','equivalent'",
      "('7-lo-06','2.1.1-lo-05','equivalent'",
      "('7-lo-07','2.1.1-lo-07','equivalent'",
      "('7-lo-08','2.1.1-lo-08','equivalent'",
      "('7-lo-09','2.1.1-lo-09','subtopic_compatible'",
      "('7-lo-09','2.1.2-lo-05','subtopic_compatible'",
    ].forEach(pair=>expect(sql).toContain(pair));
    expect(sql).toContain("source_s.code='0478' AND source_s.version_label='2023-2025'");
    expect(sql).toContain('v_0478_targets<>9');
  });

  it('does not incorrectly map the historical solution-effectiveness objective into current algorithm writing',()=>{
    expect(sql).toContain('2.1.1-lo-10 (comment on effectiveness) is intentionally omitted');
    expect(sql).not.toContain("('7-lo-09','2.1.1-lo-10'");
  });

  it('keeps the migration idempotent and relation-safe',()=>{
    expect(sql).toContain('ON CONFLICT (target_lo_id,source_lo_id) DO UPDATE');
    expect(sql).toContain("c.relation IN ('equivalent','subtopic_compatible')");
  });
});
