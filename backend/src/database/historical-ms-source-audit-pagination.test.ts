import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const migration=readFileSync(new URL('./migrations/0135_9618_ms_source_audit_pagination.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../../../supabase/functions/ms-source-audit-runner/index.ts',import.meta.url),'utf8');
const runner=readFileSync(new URL('../../scripts/ms-source-audit-runner-v4.py',import.meta.url),'utf8');

describe('historical 9618 MS source audit pagination',()=>{
  it('separates the lightweight index from bounded source batches',()=>{
    expect(migration).toContain('ms_source_audit_index_v4');
    expect(migration).toContain('ms_source_audit_batch_v4');
    expect(migration).toContain("cardinality(p_source_ids)>8");
    expect(migration).toContain("ms.status='needs_review'::review_status");
    expect(migration).toContain("q.status IN ('approved'::review_status,'needs_review'::review_status)");
    expect(migration).toContain("src.source_url IS NULL");
    expect(migration).toContain("nullif(trim(src.sha256),'') IS NULL");
  });

  it('keeps source identity explicit for every batch payload',()=>{
    expect(migration).toContain("'sourcePaperId',sp.id");
    expect(migration).toContain("'sourceUrl',sp.source_url");
    expect(migration).toContain("'sourceSha256',sp.sha256");
    expect(migration).toContain("sp.id=ANY(p_source_ids)");
    expect(migration).toContain("'9618-ms-source-audit-v2'");
    expect(migration).toContain("'9618-ms-source-audit-bootstrap-v4'");
  });

  it('routes the edge through small index and batch RPCs while retaining guarded writes',()=>{
    expect(edge).toContain("action === 'source_audit_index'");
    expect(edge).toContain("rpc('ms_source_audit_index_v4')");
    expect(edge).toContain("action === 'source_audit_batch'");
    expect(edge).toContain("rpc('ms_source_audit_batch_v4'");
    expect(edge).toContain('sourcePaperIds.length > 8');
    expect(edge).toContain("rpc('ms_source_audit_record_v2'");
    expect(edge).toContain("rpc('ms_source_audit_promote_verified_v5')");
  });

  it('reconciles index, batch identities and total audited rows before promotion',()=>{
    expect(runner).toContain('SOURCE_AUDIT_SOURCE_BATCH_SIZE');
    expect(runner).toContain('source_audit_index');
    expect(runner).toContain('source_audit_batch');
    expect(runner).toContain('source_audit_batch_identity_mismatch');
    expect(runner).toContain('audit_target_count_mismatch');
    expect(runner).toContain('audit_record_count_mismatch');
    expect(runner.indexOf('audit_target_count_mismatch')).toBeLessThan(runner.indexOf('promote_verified'));
    expect(runner).toContain('SOURCE_AUDIT_STRICT');
  });
});
