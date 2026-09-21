import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0192_live_exam_override_reason.sql',import.meta.url),
  'utf8',
);

describe('0192 live exam override reason migration',()=>{
  it('stores a bounded moderation reason on the effective answer and audit row',()=>{
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS moderation_reason text');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS reason text');
    expect(sql).toContain('BETWEEN 3 AND 500');
  });

  it('copies the teacher reason into append-only override evidence',()=>{
    expect(sql).toContain('previous_score_source,reason,created_at');
    expect(sql).toContain('OLD.score_source,NEW.moderation_reason');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION audit_live_exam_teacher_override()');
  });

  it('keeps the historical-row compatibility nullable while the converged API requires override reasons',()=>{
    expect(sql).toContain('The column remains nullable at the schema boundary so historical rows stay valid;');
    expect(sql).not.toContain('reason text NOT NULL');
  });
});
