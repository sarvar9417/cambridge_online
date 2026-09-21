import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  fileURLToPath(new URL('./migrations/0190_live_challenge_subtopic_evidence_fallback.sql', import.meta.url)),
  'utf8',
);

describe('0190 Live Challenge subtopic evidence fallback', () => {
  it('allows subtopic-only evidence without manufacturing a learning-objective id', () => {
    expect(sql).toContain('ALTER COLUMN learning_objective_id DROP NOT NULL');
    expect(sql).toContain('NULL::uuid learning_objective_id');
    expect(sql).toContain("'stable_subtopic'::text mapping_basis");
    expect(sql).toContain("mapping_basis IN ('legacy_lo','direct_lo','reviewed_compatibility','stable_subtopic')");
  });

  it('uses only a high-confidence primary stable subtopic as the fallback', () => {
    expect(sql).toContain('qst.is_primary');
    expect(sql).toContain('coalesce(qst.confidence,0) >= 0.95');
    expect(sql).toContain('target_t.number = source_t.number');
    expect(sql).toContain('target_st.code = source_st.code');
    expect(sql).toContain('NOT EXISTS (');
    expect(sql).toContain('FROM explicit_candidates mapped');
  });

  it('preserves explicit direct and reviewed LO mappings ahead of fallback', () => {
    expect(sql).toContain("'direct_lo'::text mapping_basis");
    expect(sql).toContain("'reviewed_compatibility'::text mapping_basis");
    expect(sql).toContain("compat.relation IN ('equivalent','subtopic_compatible')");
    expect(sql).toContain('direct_t.syllabus_id = target_syllabus_id');
    expect(sql).toContain('target_t.syllabus_id = target_syllabus_id');
  });

  it('keeps evidence writes idempotent for both LO and null-LO rows', () => {
    expect(sql).toContain('live_exam_learning_evidence_answer_lo_unique');
    expect(sql).toContain('WHERE learning_objective_id IS NOT NULL');
    expect(sql).toContain('live_exam_learning_evidence_answer_subtopic_fallback_unique');
    expect(sql).toContain('WHERE learning_objective_id IS NULL');
    expect(sql).toContain('ON CONFLICT DO NOTHING');
  });
});
