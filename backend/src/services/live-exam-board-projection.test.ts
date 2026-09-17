import { describe, expect, it } from 'vitest';
import { projectLiveExamForBoard } from './live-exam-board-projection.js';

const base = {
  session: {
    id: 'session-secret',
    title: 'Chapter 14 Challenge',
    className: 'AS Computer Science',
    status: 'question_open',
    currentQuestionIndex: 0,
    questionCount: 3,
    participantCount: 12,
    submittedCount: 4,
    reviewCount: 0,
    reviewedCount: 0,
    deadline: '2026-09-17T10:00:00Z',
    serverNow: '2026-09-17T09:55:00Z',
    joinCode: '123456',
    version: 42,
  },
  question: {
    id: 'session-question-secret',
    sourceQuestionId: 'canonical-question-secret',
    position: 0,
    marks: 4,
    portable: {
      sourceRef: '9618/12/M/J/25 Q3',
      leaf: {
        id: 'leaf-secret',
        rootId: 'root-secret',
        label: '(a)',
        path: '3(a)',
        displayRef: 'Q3(a)',
        stem: 'Explain one benefit.',
        stemLatex: null,
        bodyFormat: 'markdown',
        contentJson: null,
        commandWord: 'Explain',
        marks: 4,
        answerKind: 'text',
        answerLines: 4,
      },
      contextBlocks: [{
        id: 'context-secret',
        label: 'Q3',
        displayRef: 'Q3',
        depth: 0,
        context: 'Source-faithful context',
        contextLatex: null,
        assets: [{
          id: 'asset-secret',
          kind: 'diagram',
          storagePath: 'private/path.png',
          url: 'https://signed.example/diagram',
          contentMd: null,
          altText: 'Network diagram',
          sortOrder: 0,
          sourcePage: 12,
        }],
      }],
      dependencies: [{ id: 'dependency-secret' }],
    },
  },
  markScheme: null,
  participants: [{ studentId: 'student-secret', fullName: 'Private Learner' }],
  teacherAnswers: [{ answerText: 'private answer' }],
  ownAnswer: { text: 'private own answer' },
  review: { reviewerId: 'private-reviewer' },
  report: { rows: [{ answerText: 'private report answer' }] },
};

describe('projectLiveExamForBoard', () => {
  it('uses an explicit learner-safe allow-list', () => {
    const board = projectLiveExamForBoard(base);
    const serialized = JSON.stringify(board);

    expect(board.session.title).toBe('Chapter 14 Challenge');
    expect(board.question?.sourceRef).toBe('9618/12/M/J/25 Q3');
    expect(board.question?.contextBlocks[0]?.assets[0]?.url).toBe('https://signed.example/diagram');

    expect(serialized).not.toContain('session-secret');
    expect(serialized).not.toContain('canonical-question-secret');
    expect(serialized).not.toContain('leaf-secret');
    expect(serialized).not.toContain('context-secret');
    expect(serialized).not.toContain('asset-secret');
    expect(serialized).not.toContain('private/path.png');
    expect(serialized).not.toContain('dependency-secret');
    expect(serialized).not.toContain('student-secret');
    expect(serialized).not.toContain('Private Learner');
    expect(serialized).not.toContain('private answer');
    expect(serialized).not.toContain('private own answer');
    expect(serialized).not.toContain('private-reviewer');
    expect(serialized).not.toContain('private report answer');
  });

  it('shows the room code only while the room is in the lobby', () => {
    expect(projectLiveExamForBoard(base).session.joinCode).toBeNull();
    expect(projectLiveExamForBoard({
      ...base,
      session: { ...base.session, status: 'lobby' },
    }).session.joinCode).toBe('123456');
  });

  it('never manufactures a Mark Scheme before the authorised snapshot reveals one', () => {
    expect(projectLiveExamForBoard(base).markScheme).toBeNull();
    const scheme = { maxMarks: 4, points: [{ code: 'M1', text: 'Valid point' }] };
    expect(projectLiveExamForBoard({ ...base, markScheme: scheme }).markScheme).toEqual(scheme);
  });
});
