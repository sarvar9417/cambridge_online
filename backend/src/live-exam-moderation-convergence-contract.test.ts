import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const controlRoute=source('src/routes/live-exam-control.ts');
const controlService=source('src/services/live-exam-control-service.ts');
const overrideReasonMigration=source('src/database/migrations/0172_live_exam_override_reason.sql');

describe('Cambridge Live Challenge moderation convergence',()=>{
  it('never silently downgrades an unsafe peer round to self marking',()=>{
    expect(controlService).toContain("mode === 'peer' && (answers.rowCount ?? 0) < 2");
    expect(controlService).toContain("throw new DomainError('live_peer_assignment_impossible', 409)");
    expect(controlService).not.toContain("kind:'self' as const // peer fallback");
  });

  it('requires an explicit, versioned teacher action and reason before changing marking mode',()=>{
    expect(controlRoute).toContain("'/:id/marking/switch-to-teacher'");
    expect(controlRoute).toContain('expectedVersion');
    expect(controlRoute).toContain('reason:z.string().trim().min(3).max(500)');
    expect(controlService).toContain("'marking.mode_changed'");
    expect(controlService).toContain('reason:normalizedReason');
  });

  it('makes teacher override reasons durable audit evidence',()=>{
    expect(overrideReasonMigration).toContain('moderation_reason');
    expect(overrideReasonMigration).toContain('live_exam_score_overrides');
    expect(overrideReasonMigration).toContain('NEW.moderation_reason');
  });
});
