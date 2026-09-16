import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0170_live_exam_learning_evidence.sql',import.meta.url),
  'utf8',
);

describe('live exam learning evidence migration',()=>{
  it('stores canonical question and learning-objective score evidence',()=>{
    expect(sql).toContain('CREATE TABLE live_exam_learning_evidence');
    expect(sql).toContain('question_id uuid NOT NULL REFERENCES questions');
    expect(sql).toContain('learning_objective_id uuid NOT NULL REFERENCES learning_objectives');
    expect(sql).toContain('subtopic_id uuid NOT NULL REFERENCES subtopics');
    expect(sql).toContain('mapping_confidence numeric(3,2)');
    expect(sql).toContain('UNIQUE (answer_id, learning_objective_id)');
    expect(sql).toContain('teacher_overridden boolean NOT NULL DEFAULT false');
  });

  it('fails closed before publishing incomplete analytics evidence',()=>{
    expect(sql).toContain('question_learning_objectives qlo');
    expect(sql).toContain('live_exam_analytics_unmapped_question');
    expect(sql).toContain('live_exam_analytics_ungraded_answer');
    expect(sql).toContain("WHEN (NEW.status = 'finished' AND OLD.status IS DISTINCT FROM NEW.status)");
  });

  it('keeps LO evidence while avoiding duplicate subtopic mastery marks',()=>{
    expect(sql).toContain('ON CONFLICT (answer_id,learning_objective_id) DO NOTHING');
    expect(sql).toContain('subtopic_answers AS');
    expect(sql).toContain('SELECT DISTINCT');
    expect(sql).toContain('FROM subtopic_answers');
    expect(sql).toContain('INSERT INTO mastery');
    expect(sql).toContain('mastery.marks_earned + excluded.marks_earned');
    expect(sql).toContain('mastery.marks_possible + excluded.marks_possible');
  });

  it('keeps browser access behind the authenticated API boundary',()=>{
    expect(sql).toContain('ALTER TABLE live_exam_learning_evidence ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('REVOKE ALL ON live_exam_learning_evidence FROM anon, authenticated');
  });
});
