import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page=readFileSync(resolve(process.cwd(),'src/live/LiveExamPage.tsx'),'utf8');
const studentCard=readFileSync(resolve(process.cwd(),'src/student/StudentLiveChallengeCard.tsx'),'utf8');

describe('unified Live Challenge classroom controls',()=>{
  it('shows published class challenges on the student dashboard without bypassing code join',()=>{
    expect(studentCard).toContain("const UPCOMING_STATUS = new Set(['published','lobby'])");
    expect(studentCard).toContain("session.joined===true");
    expect(studentCard).toContain("session.joined!==true");
    expect(studentCard).toContain("'Kodni kiritish'");
  });

  it('exposes the classroom settings on the canonical Live Exam creator',()=>{
    expect(page).toContain('name="allowLateJoin"');
    expect(page).toContain('name="autoCloseWhenAllSubmitted"');
    expect(page).toContain('name="teacherOverrideEnabled"');
    expect(page).toContain('name="leaderboardMode"');
  });

  it('exposes explicit draft, selection, publish and lobby-open lifecycle controls',()=>{
    expect(page).toContain("'/live-exams/drafts'");
    expect(page).toContain('/questions/auto');
    expect(page).toContain('/publish');
    expect(page).toContain('/open');
    expect(page).toContain("draft:'Draft'");
    expect(page).toContain("published:'Nashr qilingan'");
    expect(page).toContain("'Draft yaratish'");
  });

  it('gives the teacher pause/resume and lobby removal controls',()=>{
    expect(page).toContain("session.pausedAt?'/resume':'/pause'");
    expect(page).toContain('expectedVersion:session.version');
    expect(page).toContain('/participants/${studentId}/remove');
  });

  it('lets teachers review, reorder and remove draft questions before publish',()=>{
    expect(page).toContain('function DraftQuestionControls');
    expect(page).toContain('Olib tashlash');
    expect(page).toContain("method:'PUT'");
    expect(page).toContain('expectedVersion:snapshot.session.version');
  });

  it('offers a teacher-marking recovery path when peer marking cannot safely start',()=>{
    expect(page).toContain("act('/marking-mode',{mode:'teacher',expectedVersion:session.version})");
    expect(page).toContain('O‘qituvchi baholashiga o‘tish');
    expect(page).toContain('Peer marking uchun kamida 2 ta faol o‘quvchi kerak');
  });

  it('separates answer lock from Mark Scheme reveal in the classroom UI',()=>{
    expect(page).toContain("act('/lock',{expectedVersion:session.version})");
    expect(page).toContain("session.status==='answers_locked'");
    expect(page).toContain("act('/reveal',{expectedVersion:session.version})");
    expect(page).toContain('Official Mark Scheme hali hech kimga ko‘rsatilmagan.');
  });

  it('loads projector mode only from the board-safe projection',()=>{
    expect(page).toContain('/board');
    expect(page).toContain('function ProjectorRoom');
    expect(page).toContain('<ProjectorRoom sessionId={sessionId}/>');
    expect(page).toContain('type LiveExamBoardSnapshot');
  });

  it('blocks student work and projector disclosure while paused',()=>{
    expect(page).toContain("if(session.pausedAt)return");
    expect(page).toContain("!session.pausedAt?<>");
    expect(page).toContain('CHALLENGE PAUZADA');
  });
});
