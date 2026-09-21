import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const entry=readFileSync(resolve(process.cwd(),'src','live','LiveExamPage.tsx'),'utf8');
const builder=readFileSync(resolve(process.cwd(),'src','live','LiveChallengeBuilder.tsx'),'utf8');
const landing=readFileSync(resolve(process.cwd(),'src','live','LiveChallengeStaffLanding.tsx'),'utf8');

describe('canonical Live Challenge builder UI',()=>{
  it('routes staff creation through the draft builder instead of the legacy room creator',()=>{
    expect(entry).toContain("route.params.get('builder')");
    expect(entry).toContain('<LiveChallengeBuilder');
    expect(entry).toContain('<LiveChallengeStaffLanding');
    expect(landing).toContain("navigate('oqitish/live?builder=new')");
  });

  it('supports draft creation, manual ordering, auto selection and publish with version guards',()=>{
    expect(builder).toContain('/live-exams/drafts');
    expect(builder).toContain("`/live-exams/${draft.id}/questions`");
    expect(builder).toContain("`/live-exams/${draft.id}/questions/auto`");
    expect(builder).toContain('expectedVersion:draft.version');
    expect(builder).toContain("`/live-exams/${draft.id}/publish`");
    expect(builder).toContain("method:'PATCH'");
    expect(builder).toContain("`/live-exams/${draft.id}/builder`");
    expect(builder).toContain('questionOrder,timingMode');
    expect(builder).toContain('autoCloseWhenAllSubmitted:autoClose');
    expect(builder).toContain('teacherOverrideEnabled,displayNameMode');
    expect(builder).toContain('requestedQuestionIds:string[]');
    expect(builder).toContain("const selectedIds=draft?.requestedQuestionIds??[]");
    expect(builder).toContain('Majburiy dependency');
  });

  it('exposes the runtime policy controls instead of hard-coding hidden settings',()=>{
    expect(builder).toContain('Savollar tartibi');
    expect(builder).toContain('Vaqt boshqaruvi');
    expect(builder).toContain('Board ismlari');
    expect(builder).toContain('Teacher override ruxsat etilsin');
    expect(builder).toContain("timingMode==='per_question'?timeLimit:null");
  });

  it('reopens draft rows in builder mode while published/runtime sessions open the classroom runtime',()=>{
    expect(landing).toContain("session.status==='draft'");
    expect(landing).toContain('`oqitish/live?builder=${session.id}`');
    expect(landing).toContain('`oqitish/live?id=${session.id}`');
  });
});
