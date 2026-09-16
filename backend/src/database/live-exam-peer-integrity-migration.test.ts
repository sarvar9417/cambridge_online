import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('./migrations/0168_live_exam_peer_integrity.sql', import.meta.url),
  'utf8',
);

describe('live exam peer integrity migration', () => {
  it('guards peer sessions at the database boundary', () => {
    expect(sql).toContain('enforce_live_exam_peer_review_integrity');
    expect(sql).toContain("session_marking_mode = 'peer'");
    expect(sql).toContain("NEW.kind <> 'peer'");
    expect(sql).toContain('NEW.reviewer_id = answer_student_id');
    expect(sql).toContain("MESSAGE = 'live_peer_assignment_impossible'");
  });

  it('checks that a review targets the declared session question', () => {
    expect(sql).toContain('lea.id = NEW.answer_id');
    expect(sql).toContain('leq.id = NEW.session_question_id');
    expect(sql).toContain("MESSAGE = 'live_peer_assignment_invalid_target'");
  });

  it('runs on both inserts and integrity-sensitive updates', () => {
    expect(sql).toContain('BEFORE INSERT OR UPDATE OF answer_id, session_question_id, reviewer_id, kind');
    expect(sql).toContain('ON live_exam_reviews');
  });
});
