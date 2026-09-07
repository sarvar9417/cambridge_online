import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const migration=readFileSync(new URL('./migrations/0134_9618_historical_ms_source_audit_v3.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../../../supabase/functions/ms-source-audit-runner/index.ts',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../../../.github/workflows/ms-source-audit.yml',import.meta.url),'utf8');

describe('historical 9618 MS source audit v3',()=>{
  it('breaks the approval circle only through the strict source-backed audit path',()=>{
    expect(migration).toContain('ms_source_audit_bootstrap_v3');
    expect(migration).toContain("q.status IN ('approved'::review_status,'needs_review'::review_status)");
    expect(migration).toContain("'9618-ms-source-audit-v2'");
    expect(migration).toContain("a.result='verified'");
    expect(migration).toContain("a.audited_at>=ms.updated_at");
    expect(migration).toContain("rubricPhrasesChecked");
    expect(migration).toContain("rubricPhrasesMatched");
    expect(migration).toContain("jsonb_array_length(coalesce(a.evidence->'reasons','[]'::jsonb))=0");
    expect(migration).toContain("ms.scheme_type<>'manual_only'::scheme_type");
    expect(migration).toContain('ms.extract_confidence>=0.95');
  });

  it('requires canonical QP provenance, structured audit, taxonomy and dependency integrity before promotion',()=>{
    expect(migration).toContain("q.content_json->'source'->>'paperId'=qp.id::text");
    expect(migration).toContain("lower(coalesce(q.content_json->'source'->>'sha256',''))=lower(qp.sha256)");
    expect(migration).toContain('structured_content_backfill_audits');
    expect(migration).toContain('question_subtopics');
    expect(migration).toContain('question_learning_objectives');
    expect(migration).toContain("qd.kind='answer_ref'");
    expect(migration).toContain("qd.strength='required'");
    expect(migration).toContain('assignment_questions');
    expect(migration).toContain('answers ans');
  });

  it('routes the production edge through v3 bootstrap/promotion but preserves the hardened v2 recorder',()=>{
    expect(edge).toContain("rpc('ms_source_audit_bootstrap_v3')");
    expect(edge).toContain("rpc('ms_source_audit_record_v2'");
    expect(edge).toContain("rpc('ms_source_audit_promote_verified_v3')");
    expect(edge).toContain("rpc('approve_source_verified_historical_questions_v1')");
  });

  it('runs the expensive production audit only from an explicit main marker',()=>{
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("'.9618-ms-source-audit-apply'");
    expect(workflow).toContain('timeout-minutes: 90');
    expect(workflow).not.toContain('fix/9618-ms-source-audit');
  });
});
