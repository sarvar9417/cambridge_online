import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(new URL('./migrations/0209_live_session_archive_fk_index.sql',import.meta.url),'utf8');

describe('Live session archive foreign-key index migration',()=>{
  it('adds a covering leading index for archived_by without changing data',()=>{
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS live_exam_sessions_archived_by_fk_idx');
    expect(sql).toContain('ON live_exam_sessions (archived_by)');
    expect(sql).not.toMatch(/\bDELETE\b|\bUPDATE\b|\bDROP\b/i);
  });
});
