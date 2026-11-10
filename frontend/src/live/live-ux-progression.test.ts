import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');
const styles=readFileSync(resolve(process.cwd(),'src/live/live-exam.css'),'utf8');

describe('Teacher quick start and live review UX',()=>{
  it('keeps one-chapter quick setup and full advanced topic selection',()=>{
    expect(page).toContain("setupMode==='quick'");
    expect(page).toContain('aria-label="Tez boshlash uchun Chapter"');
    expect(page).toContain('onChange={event=>chooseQuickChapter(event.target.value)}');
    expect(page).toContain('hidden={user.role!==\'student\'&&setupMode===\'quick\'}');
    expect(page).toContain('className="live-advanced-options"');
    expect(styles).toContain('.live-topic-grid[hidden]');
  });
  it('leaves the teacher score-approval gate intact and makes routine controls primary',()=>{
    expect(page).toContain('Baholarni tekshirdim · kartalarni ochish');
    expect(page).toContain('className="live-review-next-step"');
    expect(page).toContain('className="live-room-more"');
    expect(page).toContain('className="live-join-details"');
    expect(page).toContain('className="live-review-extra"');
  });
  it('uses the structured rich editor while preserving autosave and draft reconciliation',()=>{
    expect(page).toContain('<LiveRichAnswerEditor id="live-answer"');
    expect(page).toContain('latestAnswer.current=value;pendingSave.current=value;setAnswer(value);setDirty(true)');
    expect(page).toContain('writeLiveDraft(liveDraftKey(userId,session.id,draftKey),answer,tabId.current)');
    expect(page).toContain('onClick={()=>void submitAnswer()}');
    expect(page).toContain('<LiveAnswerDisplay value={answer.text}/>');
    expect(page).toContain('<LiveAnswerDisplay value={snapshot.review.answerText}/>');
  });
});
