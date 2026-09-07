import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const migration=readFileSync(new URL('./migrations/0139_9618_ms_source_point_repair_contract.sql',import.meta.url),'utf8');
const runner=readFileSync(new URL('../../scripts/ms-source-point-repair-v1.py',import.meta.url),'utf8');
const edge=readFileSync(new URL('../../../supabase/functions/ms-source-audit-runner/index.ts',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../../../.github/workflows/ms-source-point-repair.yml',import.meta.url),'utf8');

describe('historical 9618 MS point source repair v1',()=>{
  it('binds every write to the exact pinned MS source and latest matcher-v5 mismatch',()=>{
    expect(migration).toContain("p_manifest->>'version'<>'9618-ms-point-source-repair-v1'");
    expect(migration).toContain("v_source_kind<>'MS'");
    expect(migration).toContain("v_syllabus_code<>'9618'");
    expect(migration).toContain("v_source_year NOT BETWEEN 2021 AND 2025");
    expect(migration).toContain("lower(trim(a.source_sha256))=v_source_sha");
    expect(migration).toContain("a.audit_version='9618-ms-source-audit-v2'");
    expect(migration).toContain("a.evidence->>'matcherVersion'='9618-ms-source-matcher-v5'");
    expect(migration).toContain("r->>'code'='rubric_source_text_mismatch'");
    expect(migration).toContain("r->>'detail'=v_mismatch_detail");
    expect(migration).toContain("sourceSectionHash");
  });

  it('keeps repair narrower than approval and blocks used/manual-only schemes',()=>{
    expect(migration).toContain("v_scheme_status<>'needs_review'");
    expect(migration).toContain("v_scheme_type='manual_only'");
    expect(migration).toContain('assignment_questions');
    expect(migration).toContain('public.answers');
    expect(migration).toContain("SET status='needs_review'::review_status");
    expect(migration).toContain('mark_scheme_point_source_repair_history');
    expect(migration).toContain('length(v_new_text)>=length(v_old_text)');
    expect(migration).toContain("exact_source_substring_after_path_mark_column_strip_v1");
  });

  it('uses exact source substrings and only removes bounded path/mark layout noise',()=>{
    expect(runner).toContain('def _exact_source_substring');
    expect(runner).toContain('return f" {key} " in f" {source} "');
    expect(runner).toContain('for delete_count in (1, 2)');
    expect(runner).toContain('prev_numeric');
    expect(runner).toContain('next_numeric');
    expect(runner).toContain('len(proved) > 1');
    expect(runner).not.toContain('SequenceMatcher');
    expect(runner).not.toContain('rapidfuzz');
  });

  it('exposes only a bounded guarded apply action and an explicit main-only run marker',()=>{
    expect(edge).toContain("action === 'source_point_repair_apply'");
    expect(edge).toContain("manifest.version !== '9618-ms-point-source-repair-v1'");
    expect(edge).toContain('rows.length > 80');
    expect(edge).toContain("rpc('apply_ms_source_point_repair_v1'");
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain("'.9618-ms-source-point-repair-run'");
    expect(workflow).toContain("SOURCE_POINT_REPAIR_APPLY=NO");
    expect(workflow).toContain("SOURCE_POINT_REPAIR_APPLY=YES");
    expect(workflow).toContain('scripts.test_ms_source_point_repair_v1');
    expect(workflow).toContain('backend/scripts/ms-source-point-repair-v1.py');
  });
});
