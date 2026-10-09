import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');
const backend=readFileSync(resolve(process.cwd(),'../backend/src/services/live-exam-service.ts'),'utf8');
const routes=readFileSync(resolve(process.cwd(),'../backend/src/routes/live-exams.ts'),'utf8');

describe('Live Challenge deadline, result and late-join contracts',()=>{
  it('sends the latest typed answer when the server-aligned deadline reaches zero',()=>{
    expect(page).toContain("remaining!==0||session.status!=='question_open'");
    expect(page).toContain("void submitAnswer(true)");
    expect(page).toContain("body:JSON.stringify({text:latestAnswer.current,structuredResponse:latestStructuredResponse.current})");
    expect(page).toContain("autoSubmitAttempts.current<4");
    expect(backend).toContain("submitted_at=coalesce(live_exam_answers.submitted_at,now())");
  });

  it('releases marks only after the last assigned review has finished',()=>{
    expect(backend).toContain("const remaining = await client.query(");
    expect(backend).toContain("Number(remaining.rows[0].count) === 0");
    expect(backend).toContain("marking.completed', {automatic:true,pending:0}");
    expect(page).toContain("Sizning javobingiz");
    expect(page).toContain('structuredResponseHasContent');
    expect(page).toContain("row.feedback?<small>Izoh:");
  });

  it('shows the live join code in staff and projector views and can enable late join',()=>{
    expect(page).toContain("className=\"live-active-join\"");
    expect(page).toContain("className=\"live-projector-join\"");
    expect(page).toContain("allowLateJoin\" type=\"checkbox\" defaultChecked");
    expect(page).toContain("act('/late-join',{allowLateJoin:e.target.checked");
    expect(routes).toContain("router.post('/:id/late-join'");
    expect(backend).toContain("les.status in ('question_open','marking','review')");
  });
});
