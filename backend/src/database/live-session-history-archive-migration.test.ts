import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0205_live_session_history_archive.sql',import.meta.url),'utf8');

describe('Live session history archive migration',()=>{
  it('adds reversible history metadata without cascading session data deletion',()=>{
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS archived_at timestamptz');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES users ON DELETE SET NULL');
    expect(sql).not.toContain('DELETE FROM live_exam_sessions');
  });

  it('permits archival only for terminal sessions and indexes visible history',()=>{
    expect(sql).toContain("CHECK (archived_at IS NULL OR status IN ('finished','cancelled'))");
    expect(sql).toContain('WHERE archived_at IS NULL');
  });
});
