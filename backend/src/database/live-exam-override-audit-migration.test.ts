import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0169_live_exam_override_audit.sql',import.meta.url),
  'utf8',
);

describe('live exam override audit migration',()=>{
  it('stores immutable before and after teacher moderation evidence',()=>{
    expect(sql).toContain('CREATE TABLE live_exam_score_overrides');
    expect(sql).toContain('previous_score numeric(5,2)');
    expect(sql).toContain('new_score numeric(5,2) NOT NULL');
    expect(sql).toContain('previous_score_source live_exam_marking_mode');
    expect(sql).toContain('teacher_id uuid NOT NULL REFERENCES users');
  });

  it('audits only explicit teacher moderation changes',()=>{
    expect(sql).toContain("NEW.score_source = 'teacher'");
    expect(sql).toContain('NEW.moderated_by IS NOT NULL');
    expect(sql).toContain('OLD.final_score IS DISTINCT FROM NEW.final_score');
    expect(sql).toContain('OLD.score_source IS DISTINCT FROM NEW.score_source');
    expect(sql).toContain('AFTER UPDATE OF final_score, final_feedback_md, score_source, moderated_by, moderated_at');
  });

  it('keeps the audit table behind the Express authorisation boundary with indexed foreign keys',()=>{
    expect(sql).toContain('ALTER TABLE live_exam_score_overrides ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('REVOKE ALL ON live_exam_score_overrides FROM anon, authenticated');
    expect(sql).toContain('live_exam_score_overrides_session_created_idx');
    expect(sql).toContain('live_exam_score_overrides_question_idx');
    expect(sql).toContain('live_exam_score_overrides_answer_created_idx');
    expect(sql).toContain('live_exam_score_overrides_teacher_created_idx');
  });
});
