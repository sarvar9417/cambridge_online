import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(resolve(process.cwd(),'src/database/migrations/0172_unified_live_challenge_controls.sql'),'utf8');

describe('unified Live Challenge controls migration',()=>{
  it('adds a resumable pause without duplicating the Live Exam state machine',()=>{
    expect(sql).toContain('ADD COLUMN paused_at timestamptz');
    expect(sql).toContain('ADD COLUMN pause_remaining_s int');
    expect(sql).not.toContain('CREATE TABLE live_challenge');
    expect(sql).not.toContain("ADD VALUE 'paused'");
  });

  it('indexes only paused sessions',()=>{
    expect(sql).toContain('live_exam_sessions_paused_idx');
    expect(sql).toContain('WHERE paused_at IS NOT NULL');
  });

  it('keeps peer marking non-self while allowing the one-learner fallback',()=>{
    expect(sql).toContain("NEW.kind = 'peer'");
    expect(sql).toContain('NEW.reviewer_id <> answer_student_id');
    expect(sql).toContain("NEW.kind = 'self'");
    expect(sql).toContain('active_answer_count = 1');
    expect(sql).toContain("MESSAGE = 'live_peer_assignment_impossible'");
  });
});
