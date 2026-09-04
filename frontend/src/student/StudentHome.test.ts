import { describe, expect, it } from 'vitest';
import { daysUntil, isOpen, urgencyOf } from './StudentHome';
import type { Assignment } from '../lib/api';

const NOW = new Date('2026-08-16T09:00:00Z').getTime();
const inHours = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString();

const assignment = (over: Partial<Assignment> = {}): Assignment => ({
  id: 'a1', classId: 'c1', title: 'Topic 4 test', mode: 'online', className: '11-A',
  totalMarks: 20, opensAt: null, dueAt: inHours(48), timeLimitMin: 45,
  publishedAt: null, submissionStatus: null,
  classSize: 12, submittedCount: 0, pendingGrading: 0, ...over,
});

describe('deadline urgency', () => {
  it('separates overdue from due today', () => {
    expect(urgencyOf(inHours(-1), NOW)).toBe('overdue');
    expect(urgencyOf(inHours(1), NOW)).toBe('today');
  });

  it('treats anything inside three days as soon', () => {
    expect(urgencyOf(inHours(30), NOW)).toBe('soon');
    expect(urgencyOf(inHours(71), NOW)).toBe('soon');
    expect(urgencyOf(inHours(73), NOW)).toBe('later');
  });

  it('keeps an assignment with no deadline neutral and open', () => {
    expect(urgencyOf(null, NOW)).toBe('none');
    expect(daysUntil(null, NOW)).toBeNull();
    expect(isOpen(assignment({ dueAt: null, submissionStatus: 'not_started' }))).toBe(true);
  });

  it('floors the day count, so tomorrow never reads as today', () => {
    // Rounding would turn "due in 23 hours" into "0 kundan keyin", which a
    // student reads as due now and a teacher gets blamed for.
    expect(daysUntil(inHours(23), NOW)).toBe(0);
    expect(daysUntil(inHours(25), NOW)).toBe(1);
    expect(daysUntil(inHours(47), NOW)).toBe(1);
  });

  it('counts a late assignment in whole days late', () => {
    expect(daysUntil(inHours(-25), NOW)).toBe(-2);
    const late = daysUntil(inHours(-49), NOW);
    expect(late).not.toBeNull();
    expect(Math.abs(late!)).toBe(3);
  });
});

describe('which assignments still need work', () => {
  it('counts an untouched and an in-progress assignment as open', () => {
    expect(isOpen(assignment({ submissionStatus: null }))).toBe(true);
    expect(isOpen(assignment({ submissionStatus: 'not_started' }))).toBe(true);
    expect(isOpen(assignment({ submissionStatus: 'in_progress' }))).toBe(true);
  });

  it('drops anything already handed in', () => {
    // A submitted assignment on the "topshirish kerak" list would send a student
    // back to work they have finished.
    expect(isOpen(assignment({ submissionStatus: 'submitted' }))).toBe(false);
    expect(isOpen(assignment({ submissionStatus: 'graded' }))).toBe(false);
    expect(isOpen(assignment({ submissionStatus: 'released' }))).toBe(false);
  });
});
