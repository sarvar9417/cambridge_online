import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const controlRoute=source('src/routes/live-exam-control.ts');
const controlService=source('src/services/live-exam-control-service.ts');
const moderationRoute=source('src/routes/live-exam-moderation.ts');
const moderationService=source('src/services/live-exam-moderation-service.ts');
const app=source('src/app.ts');
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

  it('makes teacher score overrides version-aware and durable',()=>{
    expect(moderationService).toContain('assertExpectedLiveExamVersion(session,input.expectedVersion)');
    expect(moderationService).toContain('moderation_reason=$6');
    expect(moderationService).toContain("'answer.moderated'");
    expect(moderationRoute).toContain('reason:z.string().trim().min(3).max(500)');
    expect(moderationRoute).toContain('expectedVersion:z.number().int().positive()');
    expect(overrideReasonMigration).toContain('live_exam_score_overrides');
    expect(overrideReasonMigration).toContain('NEW.moderation_reason');
  });

  it('mounts reasoned moderation before the generic runtime route',()=>{
    const moderation=app.indexOf('createLiveExamModerationRouter(new LiveExamModerationService(pool))');
    const generic=app.indexOf('createLiveExamsRouter(new LiveExamService');
    expect(moderation).toBeGreaterThan(-1);
    expect(generic).toBeGreaterThan(moderation);
  });

  it('has no versionless moderation compatibility fallback left',()=>{
    expect(moderationRoute).not.toContain('next();return;');
    expect(moderationRoute).not.toContain('probe.expectedVersion');
    expect(moderationRoute).not.toContain('optional()');
  });
});
