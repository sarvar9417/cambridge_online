import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0171_live_exam_challenge_builder.sql',import.meta.url),
  'utf8',
);

describe('0171 Live Exam challenge builder migration',()=>{
  it('adds draft and published lifecycle values without replacing the canonical status type',()=>{
    expect(sql).toContain("ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'draft'");
    expect(sql).toContain("ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'published'");
    expect(sql).not.toContain('CREATE TYPE live_challenge');
  });

  it('keeps drafts code-less until publish while preserving one canonical session table',()=>{
    expect(sql).toContain('ALTER COLUMN join_code DROP NOT NULL');
    expect(sql).toContain('ALTER TABLE live_exam_sessions');
    expect(sql).toContain('ADD COLUMN published_at timestamptz');
  });

  it('pins builder scope to the class syllabus and enforces topic/subtopic shape',()=>{
    expect(sql).toContain('ADD COLUMN syllabus_id uuid REFERENCES syllabi');
    expect(sql).toContain('SET syllabus_id = c.syllabus_id');
    expect(sql).toContain('ALTER COLUMN syllabus_id SET NOT NULL');
    expect(sql).toContain('live_exam_builder_subtopic_requires_topic');
  });
});
