import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');
const css=readFileSync(resolve(process.cwd(),'src/live/live-exam.css'),'utf8');

describe('Live answer review question context',()=>{
  it('shows the active question during student marking and result review',()=>{
    expect(page).toContain('<ReviewQuestionContext question={snapshot.question}/>');
    expect(page).toContain("if(session.status==='marking'&&snapshot.markScheme)return <div className=\"live-review-workspace\">");
    expect(page).toContain("if(session.status==='review')return <section className=\"live-student-result\"><ReviewQuestionContext question={snapshot.question}/>");
  });

  it('shows the active question during teacher marking, fallback and override review',()=>{
    expect(page).toContain("session.status==='marking'?<><SessionProgress snapshot={snapshot}/><ReviewQuestionContext question={snapshot.question}/>");
    expect(page).toContain("session.status==='review'?<><ReviewQuestionContext question={snapshot.question}/><section className=\"live-review-summary\">");
    expect(page).toContain('TEKSHIRILAYOTGAN SAVOL');
  });

  it('keeps the question full-width and readable instead of clipping it into the answer card',()=>{
    expect(css).toContain('.live-review-workspace{display:grid;gap:18px;width:min(1200px,100%);margin:0 auto}');
    expect(css).toContain('.live-review-question>.live-question-card{margin:0}');
    expect(css).toContain('.live-review-question .structured-question-asset img{width:min(100%,900px)}');
  });
});
