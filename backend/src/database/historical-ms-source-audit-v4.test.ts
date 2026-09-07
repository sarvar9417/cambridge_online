import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const migration=readFileSync(new URL('./migrations/0137_9618_ms_source_matcher_v4.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../../../supabase/functions/ms-source-audit-runner/index.ts',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../../../.github/workflows/ms-source-audit.yml',import.meta.url),'utf8');
const matcher=readFileSync(new URL('../../scripts/ms-source-audit-runner-v4.py',import.meta.url),'utf8');

describe('historical 9618 MS source matcher v4',()=>{
  it('promotes only fresh strict matcher-v4 evidence from the exact pinned source',()=>{
    expect(migration).toContain('ms_source_audit_promote_verified_v4');
    expect(migration).toContain("a.evidence->>'matcherVersion'='9618-ms-source-matcher-v4'");
    expect(migration).toContain("a.result='verified'");
    expect(migration).toContain("a.source_sha256=src.sha256");
    expect(migration).toContain('a.audited_at>=ms.updated_at');
    expect(migration).toContain('rubricPhrasesChecked');
    expect(migration).toContain('rubricPhrasesMatched');
    expect(migration).toContain("jsonb_array_length(coalesce(a.evidence->'reasons','[]'::jsonb))=0");
  });

  it('allows legacy confidence supersession only as explicit matcher-v4 evidence',()=>{
    expect(migration).toContain('ms.extract_confidence>=0.95');
    expect(migration).toContain("legacyConfidenceSuperseded");
    expect(matcher).toContain('legacyConfidenceSuperseded');
    expect(matcher).toContain('checked > 0 and checked == matched');
  });

  it('preserves canonical QP, taxonomy, dependency, findings and usage gates',()=>{
    expect(migration).toContain("q.content_json->'source'->>'paperId'=qp.id::text");
    expect(migration).toContain("lower(coalesce(q.content_json->'source'->>'sha256',''))=lower(qp.sha256)");
    expect(migration).toContain('structured_content_backfill_audits');
    expect(migration).toContain('question_subtopics');
    expect(migration).toContain('question_learning_objectives');
    expect(migration).toContain("qd.kind='answer_ref'");
    expect(migration).toContain("qd.strength='required'");
    expect(migration).toContain('validation_findings');
    expect(migration).toContain('assignment_questions');
    expect(migration).toContain('answers ans');
    expect(migration).toContain("ms.scheme_type<>'manual_only'::scheme_type");
  });

  it('keeps matching deterministic and rejects fuzzy semantic matching',()=>{
    expect(matcher).toContain('def _contiguous_token_proof');
    expect(matcher).toContain('_binary_source_proof');
    expect(matcher).toContain('_source_has_cap');
    expect(matcher).toContain('.start() >= 60');
    expect(matcher).not.toContain('SequenceMatcher');
    expect(matcher).not.toContain('rapidfuzz');
  });

  it('keeps the v4 source contract available while production advances to a stricter successor',()=>{
    expect(edge).toContain("rpc('ms_source_audit_record_v2'");
    expect(edge).toContain("rpc('ms_source_audit_promote_verified_v5')");
    expect(workflow).toContain('scripts.test_ms_source_audit_v4');
    expect(workflow).toContain('scripts.test_ms_source_audit_v5');
    expect(workflow).toContain('backend/scripts/ms-source-audit-runner-v5.py');
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("'.9618-ms-source-audit-apply'");
  });
});
