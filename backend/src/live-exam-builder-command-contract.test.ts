import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const service=source('src/services/live-exam-builder-command-service.ts');
const route=source('src/routes/live-exam-builder-commands.ts');
const migration=source('src/database/migrations/0171_live_exam_challenge_builder.sql');

describe('Live Challenge draft/publish convergence contract',()=>{
  it('uses only the canonical live_exam persistence namespace',()=>{
    expect(service).toContain('insert into live_exam_sessions');
    expect(service).toContain('live_exam_questions');
    expect(service).toContain('live_exam_events');
    expect(service).not.toContain('live_challenges');
    expect(migration).not.toContain('CREATE TABLE live_challenge');
  });

  it('creates code-less drafts and assigns a room code only at publish',()=>{
    expect(service).toContain("values($1,$2,$3,null,'draft'");
    expect(service).toContain("set status='published',join_code=$2,published_at=now()");
    expect(service).toContain("status='lobby'");
    expect(route).toContain("router.post('/:id/publish'");
    expect(route).toContain("router.post('/:id/lobby/open'");
  });

  it('revalidates manual and auto selections against the strict read model',()=>{
    expect(service).toContain('this.readModel.eligibleQuestions');
    expect(service).toContain("throw new DomainError('live_questions_ineligible',409)");
    expect(service).toContain('selectionMode:\'manual\'');
    expect(service).toContain("selectionMode:'auto'");
  });

  it('refreshes immutable question and Mark Scheme snapshots at publish',()=>{
    expect(service).toContain('question_snapshot=$4::jsonb,mark_scheme_snapshot=$5::jsonb');
    expect(service).toContain('this.questions.portable(actor,questionId)');
    expect(service).toContain("ms.status='approved'");
  });
});
