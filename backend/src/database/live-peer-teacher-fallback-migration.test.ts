import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql=readFileSync(
  new URL('./migrations/0204_live_peer_teacher_fallback.sql',import.meta.url),
  'utf8',
);

describe('live peer teacher fallback migration',()=>{
  it('allows only the session host to take over an unfinished peer review',()=>{
    expect(sql).toContain('les.host_id');
    expect(sql).toContain("NEW.kind = 'teacher'");
    expect(sql).toContain('NEW.reviewer_id = session_host_id');
    expect(sql).toContain("MESSAGE = 'live_peer_assignment_impossible'");
  });

  it('preserves anonymous peer and historical one-learner self constraints',()=>{
    expect(sql).toContain("NEW.kind = 'peer'");
    expect(sql).toContain('NEW.reviewer_id <> answer_student_id');
    expect(sql).toContain("NEW.kind = 'self'");
    expect(sql).toContain('active_answer_count = 1');
  });
});
