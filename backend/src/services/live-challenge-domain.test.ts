import { describe, expect, it } from 'vitest';
import {
  LiveChallengePeerAssignmentError,
  LiveChallengeTransitionError,
  assertLiveChallengeTransition,
  buildLiveChallengePeerAssignments,
  canTransitionLiveChallenge,
  projectLiveChallengeForStudent,
  studentCanSeeMarkScheme,
  type PeerAnswerIdentity,
} from './live-challenge-domain.js';

describe('Cambridge Live Challenge state machine', () => {
  it('accepts the canonical classroom round path', () => {
    const path = [
      ['DRAFT', 'PUBLISHED'],
      ['PUBLISHED', 'LOBBY'],
      ['LOBBY', 'QUESTION_ACTIVE'],
      ['QUESTION_ACTIVE', 'ANSWERS_LOCKED'],
      ['ANSWERS_LOCKED', 'PEER_MARKING'],
      ['PEER_MARKING', 'ROUND_RESULTS'],
      ['ROUND_RESULTS', 'QUESTION_ACTIVE'],
    ] as const;

    for (const [from, to] of path) expect(canTransitionLiveChallenge(from, to)).toBe(true);
  });

  it('keeps finished and cancelled sessions terminal', () => {
    expect(canTransitionLiveChallenge('FINISHED', 'LOBBY')).toBe(false);
    expect(canTransitionLiveChallenge('CANCELLED', 'LOBBY')).toBe(false);
  });

  it('resumes a paused session only to the recorded paused-from state', () => {
    expect(canTransitionLiveChallenge('PAUSED', 'QUESTION_ACTIVE', 'QUESTION_ACTIVE')).toBe(true);
    expect(canTransitionLiveChallenge('PAUSED', 'PEER_MARKING', 'QUESTION_ACTIVE')).toBe(false);
    expect(canTransitionLiveChallenge('PAUSED', 'QUESTION_ACTIVE', null)).toBe(false);
  });

  it('rejects skipping from an active question directly to results', () => {
    expect(() => assertLiveChallengeTransition('QUESTION_ACTIVE', 'ROUND_RESULTS')).toThrow(
      LiveChallengeTransitionError,
    );
  });
});

describe('student mark-scheme secrecy', () => {
  it('withholds the mark scheme before peer marking starts', () => {
    for (const status of ['DRAFT', 'PUBLISHED', 'LOBBY', 'QUESTION_ACTIVE', 'ANSWERS_LOCKED', 'PAUSED'] as const) {
      expect(studentCanSeeMarkScheme(status)).toBe(false);
    }
  });

  it('reveals the mark scheme only from peer marking onward', () => {
    for (const status of ['PEER_MARKING', 'ROUND_RESULTS', 'FINISHED'] as const) {
      expect(studentCanSeeMarkScheme(status)).toBe(true);
    }
  });

  it('projects an active question without leaking its scheme', () => {
    expect(
      projectLiveChallengeForStudent({
        status: 'QUESTION_ACTIVE',
        question: { id: 'q1', text: 'Explain...' },
        markScheme: { points: ['MP1'] },
      }),
    ).toEqual({
      status: 'QUESTION_ACTIVE',
      question: { id: 'q1', text: 'Explain...' },
      markScheme: null,
    });
  });
});

describe('anonymous peer assignment', () => {
  const answers = (count: number): PeerAnswerIdentity[] =>
    Array.from({ length: count }, (_, index) => ({
      answerId: `answer-${index + 1}`,
      studentId: `student-${index + 1}`,
    }));

  it.each([2, 3, 5, 18])('creates a complete self-mark-free assignment for %i answers', (count) => {
    const input = answers(count);
    const assignments = buildLiveChallengePeerAssignments(input, 'round-123');

    expect(assignments).toHaveLength(count);
    expect(new Set(assignments.map((assignment) => assignment.markerStudentId)).size).toBe(count);
    expect(new Set(assignments.map((assignment) => assignment.answerId)).size).toBe(count);
    for (const assignment of assignments) {
      expect(assignment.markerStudentId).not.toBe(assignment.answerStudentId);
    }
  });

  it('is deterministic for recovery and reconnect', () => {
    const input = answers(7);
    expect(buildLiveChallengePeerAssignments(input, 'same-round')).toEqual(
      buildLiveChallengePeerAssignments([...input].reverse(), 'same-round'),
    );
  });

  it('fails closed when one submitted answer cannot be peer-marked safely', () => {
    expect(() => buildLiveChallengePeerAssignments(answers(1), 'round-1')).toThrow(
      LiveChallengePeerAssignmentError,
    );
  });

  it('rejects duplicate student identities rather than risking self-marking', () => {
    expect(() =>
      buildLiveChallengePeerAssignments(
        [
          { answerId: 'a1', studentId: 's1' },
          { answerId: 'a2', studentId: 's1' },
        ],
        'round-1',
      ),
    ).toThrowError('live_challenge_peer_assignment:duplicate_student');
  });
});
