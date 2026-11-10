import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');
const css=readFileSync(resolve(process.cwd(),'src/live/live-exam.css'),'utf8');

describe('Live answer review question context',()=>{
  it('shows the active question during student marking and result review',()=>{
    expect(page).toContain('<ReviewQuestionContext question={snapshot.question}/>');
    expect(page).toContain("if(session.status==='marking'&&snapshot.markScheme)return <div className=\"live-review-workspace\">");
    expect(page).toContain("if(session.status==='review')return <section className=\"live-student-result\">{session.settings.playMode==='cards'?<LiveCardBoard snapshot={snapshot} refresh={refresh} interactive={false}/>:null}<ReviewQuestionContext question={snapshot.question}/>");
  });

  it('keeps the learner view read-only while teacher cards remain interactive',()=>{
    expect(page).toContain("session.status==='lobby'&&session.settings.playMode==='cards')return <div className=\"live-card-student-lobby\"><LiveCardBoard snapshot={snapshot} refresh={refresh} interactive={false}/>");
    expect(page).toContain("session.settings.playMode==='cards'&&session.status==='lobby'?<LiveCardBoard snapshot={snapshot} refresh={refresh} interactive/>");
    expect(page).toContain("session.settings.playMode==='cards'&&cardReviewConfirmed&&session.currentQuestionIndex+1<session.questionCount?<LiveCardBoard snapshot={snapshot} refresh={refresh} interactive/>");
    expect(page).toContain("Baholarni tekshirdim · kartalarni ochish");
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
