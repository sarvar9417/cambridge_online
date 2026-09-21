import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const service=readFileSync(resolve(process.cwd(),'src/services/live-exam-service.ts'),'utf8');
const routes=readFileSync(resolve(process.cwd(),'src/routes/live-exams.ts'),'utf8');
const migration=readFileSync(resolve(process.cwd(),'src/database/migrations/0191_live_challenge_builder_lifecycle.sql'),'utf8');

describe('Live Challenge current-main builder convergence contract',()=>{
  it('keeps one canonical live_exam persistence model',()=>{
    expect(migration).not.toContain('CREATE TABLE live_challenge');
    expect(service).toContain('insert into live_exam_sessions');
    expect(service).toContain('insert into live_exam_questions');
  });

  it('creates drafts without a join code and allocates it only at publish',()=>{
    expect(service).toContain("values($1,$2,$3,null,'draft'");
    expect(service).toContain("set status='published'");
    expect(service).toContain('update live_exam_sessions set join_code=$2');
  });

  it('reuses current-main eligibility and required dependency expansion',()=>{
    expect(service).toContain('chooseQuestionIds(actor, input');
    expect(service).toContain('expandRequiredDependencies(rootQuestionIds)');
    expect(service).toContain('selectedQuestionIds');
  });

  it('requires versions on all new builder mutation routes',()=>{
    expect(routes).toContain('expectedVersion: requiredVersion');
    expect(routes).toContain("router.put('/:id/questions'");
    expect(routes).toContain("router.post('/:id/questions/auto'");
    expect(routes).toContain("router.post('/:id/publish'");
    expect(routes).toContain("router.post('/:id/open'");
  });
});
