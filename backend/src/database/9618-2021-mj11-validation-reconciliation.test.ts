import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0189_reconcile_9618_2021_mj11_stale_validation_warning.sql',import.meta.url),
  'utf8',
);

describe('0189 stale 2021 MJ11 validation warning reconciliation',()=>{
  it('pins the exact official QP source',()=>{
    expect(sql).toContain('d73fa3294ec38a62d756742887a1bfc99909a2135ea86ac4a6713915fc305453');
    expect(sql).toContain("sp.year=2021");
    expect(sql).toContain("sp.series='MJ'::exam_series");
    expect(sql).toContain('sp.variant=1');
  });

  it('requires the current 30-leaf / 75-mark release state',()=>{
    expect(sql).toContain('v_leaves<>30 OR v_approved<>30 OR v_marks<>75');
    expect(sql).toContain('v_latex<>30 OR v_structured<>30');
    expect(sql).toContain('v_low_primary<>0 OR v_low_lo<>0 OR v_bad_ms<>0');
  });

  it('reconciles only the historical durable repair finding',()=>{
    expect(sql).toContain("rule_code='MANUAL-DURABLE-REPAIR'");
    expect(sql).toContain("ref_table='source_papers'");
    expect(sql).toContain('historical ingest warning no longer reflects current corpus state');
  });

  it('does not mutate corpus content',()=>{
    expect(sql).not.toContain('UPDATE public.questions');
    expect(sql).not.toContain('UPDATE public.mark_schemes');
    expect(sql).not.toContain('UPDATE public.question_subtopics');
    expect(sql).not.toContain('UPDATE public.question_learning_objectives');
  });
});
