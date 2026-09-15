import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('./migrations/0166_live_exam_sessions.sql', import.meta.url),
  'utf8',
);

const tables = [
  'live_exam_sessions',
  'live_exam_questions',
  'live_exam_participants',
  'live_exam_answers',
  'live_exam_reviews',
  'live_exam_review_points',
  'live_exam_events',
];

describe('live exam schema migration', () => {
  it('stores immutable question and mark-scheme snapshots with durable answers and reviews', () => {
    expect(sql).toContain('question_snapshot jsonb NOT NULL');
    expect(sql).toContain('mark_scheme_snapshot jsonb NOT NULL');
    expect(sql).toContain('UNIQUE (session_id, position)');
    expect(sql).toContain('UNIQUE (session_question_id, participant_id)');
    expect(sql).toContain('UNIQUE (session_question_id, answer_id, kind)');
    expect(sql).toContain('session_version bigint NOT NULL');
    expect(sql).not.toContain('mark_scheme_point_id uuid NOT NULL REFERENCES mark_scheme_points');
  });

  it('enables RLS and removes direct browser grants from every exposed table', () => {
    for (const table of tables) {
      expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    }
    expect(sql).toMatch(/REVOKE ALL ON live_exam_sessions,[\s\S]+FROM anon, authenticated/);
    expect(sql).toContain('REVOKE ALL ON SEQUENCE live_exam_events_id_seq FROM anon, authenticated');
  });

  it('indexes the session, presence, submission, review and event hot paths', () => {
    expect(sql).toContain('live_exam_sessions_host_active_idx');
    expect(sql).toContain('live_exam_participants_session_active_idx');
    expect(sql).toContain('live_exam_answers_question_submit_idx');
    expect(sql).toContain('live_exam_reviews_reviewer_status_idx');
    expect(sql).toContain('live_exam_events_session_version_idx');
  });
});
