import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

const route=source('src/routes/live-exams.ts');
const builderRoute=source('src/routes/live-exam-builder.ts');
const builderService=source('src/services/live-exam-builder-service.ts');
const boardProjection=source('src/services/live-exam-board-projection.ts');
const versionGuard=source('src/services/live-exam-transition-guard.ts');
const schema=source('src/database/migrations/0166_live_exam_sessions.sql');
const builderLifecycle=source('src/database/migrations/0172_live_exam_builder_lifecycle.sql');

describe('Cambridge Live Challenge convergence contract',()=>{
  it('keeps live_exam as the only production live-classroom persistence root',()=>{
    expect(schema).toContain('live_exam_sessions');
    expect(schema).toContain('live_exam_questions');
    expect(schema).toContain('live_exam_participants');
    expect(schema).toContain('live_exam_answers');
    expect(schema).toContain('live_exam_reviews');
    expect(existsSync(resolve(process.cwd(),'src/database/migrations/0168_live_challenge_foundation.sql'))).toBe(false);
  });

  it('extends the canonical lifecycle for builder and pause semantics',()=>{
    expect(builderLifecycle).toContain("ADD VALUE IF NOT EXISTS 'draft' BEFORE 'lobby'");
    expect(builderLifecycle).toContain("ADD VALUE IF NOT EXISTS 'published' BEFORE 'lobby'");
    expect(builderLifecycle).toContain("ADD VALUE IF NOT EXISTS 'answers_locked' AFTER 'question_open'");
    expect(builderLifecycle).toContain("ADD VALUE IF NOT EXISTS 'paused' AFTER 'review'");
    expect(builderLifecycle).toContain('ALTER COLUMN join_code DROP NOT NULL');
    expect(builderLifecycle).toContain('draft challenges keep this null');
    expect(builderLifecycle).toContain('published_at timestamptz');
    expect(builderLifecycle).toContain('paused_from_status live_exam_status');
    expect(builderLifecycle).not.toContain('CREATE TABLE live_challenge_');
  });

  it('owns draft creation selection ordering and publish inside live_exam tables',()=>{
    expect(builderRoute).toContain("router.post('/drafts'");
    expect(builderRoute).toContain("router.put('/:id/questions'");
    expect(builderRoute).toContain("router.post('/:id/questions/auto'");
    expect(builderRoute).toContain("router.post('/:id/publish'");
    expect(builderService).toContain("insert into live_exam_sessions");
    expect(builderService).toContain("insert into live_exam_questions");
    expect(builderService).toContain("delete from live_exam_questions where session_id=$1");
    expect(builderService).not.toContain('live_challenge_questions');
    expect(builderService).not.toContain('live_challenges');
  });

  it('guards every post-create draft mutation with the authoritative version',()=>{
    expect(builderRoute).toContain('expectedVersion');
    expect(builderService).toContain('assertExpectedLiveExamVersion(draft,expectedVersion)');
    expect(builderService).toContain("for update of les");
    expect(builderService).toContain("'draft.questions_replaced'");
  });

  it('revalidates and re-snapshots canonical question evidence at publish time',()=>{
    expect(builderService).toContain('const eligible=await this.eligibleRows');
    expect(builderService).toContain('const snapshot=await this.snapshotQuestion');
    expect(builderService).toContain('question_snapshot=$4::jsonb');
    expect(builderService).toContain('mark_scheme_snapshot=$5::jsonb');
    expect(builderService).toContain("status='published'");
    expect(builderService).toContain("'challenge.published'");
  });

  it('owns the shared classroom board through the canonical live-exams API',()=>{
    expect(route).toContain("router.get('/:id/board'");
    expect(route).toContain('projectLiveExamForBoard(snapshot)');
    expect(route).toContain("req.actor!.role === 'student'");
    expect(route).toContain("privateNoStore(res)");
  });

  it('makes board projection an explicit learner-safe allow-list',()=>{
    expect(boardProjection).toContain('Learner-safe shared classroom board projection');
    expect(boardProjection).toContain('structuredBlocks: projectStructuredBlocks');
    expect(boardProjection).toContain('contentJson: null');
    expect(boardProjection).not.toContain('teacherAnswers');
    expect(boardProjection).not.toContain('ownAnswer');
    expect(boardProjection).not.toContain('participants:');
    expect(boardProjection).not.toContain('moderatedBy');
    expect(boardProjection).not.toContain('storagePath:');
  });

  it('keeps Mark Scheme reveal authority in the server snapshot and projects only learner-safe fields',()=>{
    expect(boardProjection).toContain('const scheme = source.markScheme');
    expect(boardProjection).toContain('const markScheme = scheme ?');
    expect(boardProjection).toContain('code: text(point.code)');
    expect(boardProjection).toContain('label: text(group.label)');
    expect(boardProjection).not.toContain('markScheme: source.markScheme ?? null');
    expect(boardProjection).not.toContain('mark_scheme_snapshot');
  });

  it('has a fail-closed optimistic concurrency primitive ready for locked teacher transitions',()=>{
    expect(versionGuard).toContain('after the session row has been locked');
    expect(versionGuard).toContain("new DomainError('live_state_conflict', 409)");
    expect(versionGuard).toContain('actualVersion !== expectedVersion');
  });
});
