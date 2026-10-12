import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0209_structured_response_readiness_audit.sql',import.meta.url),
  'utf8',
);

describe('0209 structured response readiness audit migration',()=>{
  it('creates a server-only source-backed response audit view',()=>{
    expect(sql).toContain('CREATE OR REPLACE VIEW public.question_response_readiness_audit_v1');
    expect(sql).toContain('WITH (security_invoker=true)');
    expect(sql).toContain('REVOKE ALL ON public.question_response_readiness_audit_v1 FROM anon,authenticated');
  });

  it('detects editable-table, matching and supported stack response surfaces',()=>{
    expect(sql).toContain("block->>'type'='table'");
    expect(sql).toContain("block->'editableCells'");
    expect(sql).toContain("block->>'type'='matching'");
    expect(sql).toContain('stack_workspace_supported');
    expect(sql).toContain("'missing_editable_table'");
    expect(sql).toContain("'missing_matching_structure'");
  });

  it('does not rewrite canonical question content or approval status',()=>{
    expect(sql).not.toMatch(/update\s+public\.questions/i);
    expect(sql).not.toMatch(/insert\s+into\s+public\.questions/i);
  });
});
