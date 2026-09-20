import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('./migrations/0173_live_challenge_database_hardening.sql', import.meta.url),
  'utf8',
);

describe('0173 Live Challenge database hardening migration', () => {
  it('covers each learning-evidence foreign key used outside an existing leading index', () => {
    expect(sql).toContain('live_exam_learning_evidence (session_question_id)');
    expect(sql).toContain('live_exam_learning_evidence (learning_objective_id)');
    expect(sql).toContain('live_exam_learning_evidence (subtopic_id)');
  });

  it('pins every Live Challenge trigger function search path', () => {
    expect(sql).toContain('ALTER FUNCTION public.enforce_live_exam_peer_review_integrity()');
    expect(sql).toContain('ALTER FUNCTION public.audit_live_exam_teacher_override()');
    expect(sql).toContain('ALTER FUNCTION public.persist_live_exam_learning_evidence()');
    expect(sql).toContain('ALTER FUNCTION public.guard_approved_9618_structured_content_source_host_v1()');
    expect(sql.match(/SET search_path = public, pg_temp;/g)).toHaveLength(4);
  });
});
