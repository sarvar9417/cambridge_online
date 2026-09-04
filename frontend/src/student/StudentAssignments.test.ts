import { describe, expect, it } from 'vitest';
import type { Assignment } from '../lib/api';
import { assignmentDueState, studentAssignmentBucket } from './StudentAssignments';

const NOW = new Date('2026-09-04T08:00:00Z').getTime();
const inHours = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString();

const assignment = (over: Partial<Assignment> = {}): Assignment => ({
  id:'a1', classId:'c1', title:'Chapter test', mode:'online', className:'11-A', totalMarks:25,
  opensAt:null, dueAt:inHours(48), timeLimitMin:45, publishedAt:null, submissionStatus:null,
  classSize:20, submittedCount:0, pendingGrading:0, ...over,
});

describe('student assignment workspace state', () => {
  it('keeps active work separate from untouched work', () => {
    expect(studentAssignmentBucket(assignment({ submissionStatus:null }))).toBe('todo');
    expect(studentAssignmentBucket(assignment({ submissionStatus:'not_started' }))).toBe('todo');
    expect(studentAssignmentBucket(assignment({ submissionStatus:'in_progress' }))).toBe('in_progress');
  });

  it('does not send handed-in work back into the action queue', () => {
    expect(studentAssignmentBucket(assignment({ submissionStatus:'submitted' }))).toBe('submitted');
    expect(studentAssignmentBucket(assignment({ submissionStatus:'graded' }))).toBe('completed');
    expect(studentAssignmentBucket(assignment({ submissionStatus:'released' }))).toBe('completed');
  });

  it('classifies deadline pressure without treating future work as late', () => {
    expect(assignmentDueState(inHours(-1), NOW)).toBe('overdue');
    expect(assignmentDueState(inHours(3), NOW)).toBe('today');
    expect(assignmentDueState(inHours(30), NOW)).toBe('soon');
    expect(assignmentDueState(inHours(80), NOW)).toBe('later');
  });
});
