import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0191_live_exam_builder_lifecycle.sql',import.meta.url),
  'utf8',
);

describe('0191 live exam builder lifecycle migration',()=>{
  it('extends the existing live_exam enum instead of creating a second runtime schema',()=>{
    expect(sql).toContain("ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'draft'");
    expect(sql).toContain("ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'published'");
    expect(sql).toContain("ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'answers_locked'");
    expect(sql).toContain("ALTER TYPE live_exam_status ADD VALUE IF NOT EXISTS 'paused'");
    expect(sql).not.toContain('CREATE TABLE live_challenge');
  });

  it('allows draft challenges to exist before a room code is allocated',()=>{
    expect(sql).toContain('ALTER COLUMN join_code DROP NOT NULL');
    expect(sql).toContain('draft challenges keep this null');
  });

  it('persists publication and pause metadata for later state transitions',()=>{
    expect(sql).toContain('published_at timestamptz');
    expect(sql).toContain('paused_at timestamptz');
    expect(sql).toContain('paused_from_status live_exam_status');
  });
});
