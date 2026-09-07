import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const migration=readFileSync(new URL('./migrations/0138_9618_ms_source_matcher_v5.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../../../supabase/functions/ms-source-audit-runner/index.ts',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../../../.github/workflows/ms-source-audit.yml',import.meta.url),'utf8');
const matcher=readFileSync(new URL('../../scripts/ms-source-audit-runner-v5.py',import.meta.url),'utf8');

describe('historical 9618 MS source matcher v5',()=>{
  it('promotes only exact fresh strict matcher-v5 evidence',()=>{
    expect(migration).toContain('ms_source_audit_promote_verified_v5');
    expect(migration).toContain("a.evidence->>'matcherVersion'='9618-ms-source-matcher-v5'");
    expect(migration).toContain("a.source_sha256=src.sha256");
    expect(migration).toContain("a.result='verified'");
    expect(migration).toContain("coalesce((a.evidence->>'strict')::boolean,false)=true");
    expect(migration).toContain('a.audited_at>=ms.updated_at');
    expect(migration).toContain('rubricPhrasesChecked');
    expect(migration).toContain('rubricPhrasesMatched');
    expect(migration).toContain("jsonb_array_length(coalesce(a.evidence->'reasons','[]'::jsonb))=0");
  });

  it('recovers only internal group labels and exact intra-scheme requires references',()=>{
    expect(matcher).toContain('recoveredInternalGroupLabelsV5');
    expect(matcher).toContain('recoveredInternalRequiresV5');
    expect(matcher).toContain('return requirement in point_codes');
    expect(matcher).toContain('SOURCE_HAS_CAP(source_text, required, max_marks)');
    expect(matcher).not.toContain('SequenceMatcher');
    expect(matcher).not.toContain('rapidfuzz');
    expect(matcher).not.toContain('semantic similarity');
  });

  it('preserves canonical QP, taxonomy, dependency, findings, usage and manual-only gates',()=>{
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

  it('keeps paginated source retrieval and routes production through v5',()=>{
    expect(edge).toContain("rpc('ms_source_audit_index_v4')");
    expect(edge).toContain("rpc('ms_source_audit_batch_v4'");
    expect(edge).toContain("rpc('ms_source_audit_record_v2'");
    expect(edge).toContain("rpc('ms_source_audit_promote_verified_v5')");
    expect(workflow).toContain('scripts.test_ms_source_audit_v5');
    expect(workflow).toContain('backend/scripts/ms-source-audit-runner-v5.py');
  });
});
