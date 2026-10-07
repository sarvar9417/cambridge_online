import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./audits/generic-flattened-table-guard-v9.sql',import.meta.url),
  'utf8',
);

describe('generic flattened source-table guard',()=>{
  it('extends the source fidelity entry point without replacing v8 behavior',()=>{
    expect(sql).toContain('flag_source_fidelity_requirements_v9');
    expect(sql).toContain('flag_source_fidelity_requirements_v8');
    expect(sql).toContain('flag_source_fidelity_requirements_v1');
  });

  it('detects common ordinary-table headers conservatively',()=>{
    expect(sql).toContain('statement[[:space:]]+number[[:space:]]+statement');
    expect(sql).toContain('register[[:space:]]+(purpose|description|function)');
    expect(sql).toContain('numeric_labels>=3');
    expect(sql).toContain('source_generic_table_ocr_spill');
  });

  it('fails closed instead of guessing a reconstructed table',()=>{
    expect(sql).toContain("status='needs_review'::review_status");
    expect(sql).toContain('source-backed structured repair is required');
    expect(sql).not.toContain("jsonb_build_object('type','table'");
  });
});
