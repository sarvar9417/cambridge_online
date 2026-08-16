import { describe, expect, it } from 'vitest';
import { stateOf } from './TeacherAssignments';
import { scoreOf } from './GradingQueue';
import type { Assignment, GradingItem } from '../lib/api';

const NOW = new Date('2026-08-16T09:00:00Z').getTime();
const inHours = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString();

const assignment = (over: Partial<Assignment> = {}): Assignment => ({
  id: 'a1', classId: 'c1', title: 'Topic 4', mode: 'online', className: '11-A',
  totalMarks: 20, opensAt: null, dueAt: inHours(48), timeLimitMin: null,
  publishedAt: inHours(-24), submissionStatus: null,
  classSize: 12, submittedCount: 0, pendingGrading: 0, ...over,
});

let seq = 0;
const point = (marks: number, matched: boolean | null) =>
  ({ id: `p${(seq += 1)}`, code: `MP${seq}`, text: 'point', matched, marks });

const item = (points: GradingItem['points']): GradingItem => ({
  id: 'g1', text: 'answer', displayRef: '3(b)', stemMd: 'Explain', marks: 4,
  answerKind: 'text', studentName: 'Aziza', points,
});

describe('what state an assignment is in', () => {
  it('is a draft until it is published, whatever the due date says', () => {
    // An unpublished assignment with a past due date is not "closed" -- no
    // student ever saw it. Calling it closed would hide it from the list.
    expect(stateOf(assignment({ publishedAt: null }), NOW)).toBe('draft');
    expect(stateOf(assignment({ publishedAt: null, dueAt: inHours(-72) }), NOW)).toBe('draft');
  });

  it('is open while published and not yet due', () => {
    expect(stateOf(assignment({ dueAt: inHours(1) }), NOW)).toBe('open');
  });

  it('closes when the deadline passes', () => {
    expect(stateOf(assignment({ dueAt: inHours(-1) }), NOW)).toBe('closed');
  });
});

describe('the mark about to be released', () => {
  it('adds up only the ticked points', () => {
    // 1 awarded + 2 refused + 3 awarded.
    expect(scoreOf(item([point(1, true), point(2, false), point(3, true)]))).toBe(4);
  });

  it('counts an untouched point as not awarded', () => {
    // matched is null before the teacher has looked at it; treating null as
    // awarded would release marks nobody agreed to.
    expect(scoreOf(item([point(2, null), point(1, true)]))).toBe(1);
  });

  it('is zero for an answer with nothing ticked', () => {
    expect(scoreOf(item([point(1, false), point(1, null)]))).toBe(0);
  });

  it('is zero when the question has no mark scheme to tick', () => {
    expect(scoreOf(item([]))).toBe(0);
  });
});
