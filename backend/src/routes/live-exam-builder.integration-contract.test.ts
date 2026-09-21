import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const service=readFileSync(resolve(process.cwd(),'src/services/live-exam-builder-service.ts'),'utf8');
const route=readFileSync(resolve(process.cwd(),'src/routes/live-exam-builder.ts'),'utf8');

describe('Live Challenge builder transaction contract',()=>{
  it('creates drafts without a join code and publishes only after explicit selection',()=>{
    expect(service).toContain("values($1,$2,$3,null,'draft'");
    expect(service).toContain("if(!draft.requestedQuestionIds.length)throw new DomainError('live_builder_questions_required',409)");
    expect(service).toContain('requestedQuestionIds');
    expect(service).toContain("set status='published',join_code=$2");
  });

  it('treats ordered replacement as the canonical manual selection primitive',()=>{
    expect(route).toContain('array order becomes the canonical classroom order');
    expect(service).toContain("delete from live_exam_questions where session_id=$1");
    expect(service).toContain('for(const [position,s] of snapshots.entries())');
  });

  it('rechecks source eligibility and immutable assessment snapshots at publish',()=>{
    expect(service).toContain('const eligible=await this.eligibleRows');
    expect(service).toContain('const snapshot=await this.snapshotQuestion');
    expect(service).toContain('question_snapshot=$5::jsonb');
    expect(service).toContain('mark_scheme_snapshot=$6::jsonb');
    expect(service).toContain('const expanded=await this.expandRequiredDependencies');
  });

  it('serializes teacher draft changes behind a locked version check',()=>{
    expect(service).toContain('for update of les');
    expect(service).toContain('assertExpectedLiveExamVersion(draft,expectedVersion)');
    expect(route).toContain('expectedVersion');
  });
});
