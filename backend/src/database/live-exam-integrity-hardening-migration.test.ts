import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('./migrations/0191_live_challenge_integrity_and_deadline_hardening.sql', import.meta.url),
  'utf8',
);

describe('live exam integrity hardening migration', () => {
  it('rejects cross-session answers and reviews at the database boundary', () => {
    expect(sql).toContain('validate_live_exam_answer_integrity');
    expect(sql).toContain("MESSAGE = 'live_answer_session_mismatch'");
    expect(sql).toContain('validate_live_exam_review_integrity');
    expect(sql).toContain("MESSAGE = 'live_review_session_mismatch'");
  });

  it('caps answer, review, and point scores against immutable assessment data', () => {
    expect(sql).toContain("MESSAGE = 'live_answer_score_exceeds_marks'");
    expect(sql).toContain("MESSAGE = 'live_review_score_exceeds_marks'");
    expect(sql).toContain("MESSAGE = 'live_review_point_score_exceeds_marks'");
    expect(sql).toContain("coalesce(leq.mark_scheme_snapshot->'points','[]'::jsonb)");
    expect(sql).toContain('live_exam_answers_score_source_check');
    expect(sql).toContain('live_exam_answers_moderation_pair_check');
    expect(sql).toContain('live_exam_reviews_moderation_pair_check');
  });

  it('makes event versions unique and repins all live trigger functions', () => {
    expect(sql).toContain('live_exam_events_session_version_unique');
    expect(sql.match(/ALTER FUNCTION[\s\S]*?SET search_path = public, pg_temp;/g)).toHaveLength(4);
    expect(sql).toContain('ALTER FUNCTION public.persist_live_exam_learning_evidence()');
    expect(sql).toContain('ALTER FUNCTION public.guard_approved_9618_structured_content_source_host_v1()');
  });
});
