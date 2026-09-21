import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  resolve(process.cwd(),'src/database/migrations/0191_live_challenge_builder_lifecycle.sql'),
  'utf8',
);

describe('Live Challenge builder lifecycle migration',()=>{
  it('extends the canonical live_exam state machine without creating a parallel schema',()=>{
    expect(sql).toContain("ADD VALUE IF NOT EXISTS 'draft' BEFORE 'lobby'");
    expect(sql).toContain("ADD VALUE IF NOT EXISTS 'published' BEFORE 'lobby'");
    expect(sql).toContain("ADD VALUE IF NOT EXISTS 'answers_locked' AFTER 'question_open'");
    expect(sql).not.toContain('CREATE TABLE live_challenge');
  });

  it('keeps draft rooms private until publish',()=>{
    expect(sql).toContain('ALTER COLUMN join_code DROP NOT NULL');
    expect(sql).toContain('ADD COLUMN published_at timestamptz');
  });

  it('does not duplicate the orthogonal pause representation already on current main',()=>{
    expect(sql).not.toContain("ADD VALUE IF NOT EXISTS 'paused'");
    expect(sql).not.toContain('ADD COLUMN paused_at');
    expect(sql).not.toContain('ADD COLUMN pause_remaining_s');
  });
});
