export const LIVE_CHALLENGE_STATUSES = [
  'DRAFT',
  'PUBLISHED',
  'LOBBY',
  'QUESTION_ACTIVE',
  'ANSWERS_LOCKED',
  'PEER_MARKING',
  'ROUND_RESULTS',
  'FINISHED',
  'PAUSED',
  'CANCELLED',
] as const;

export type LiveChallengeStatus = (typeof LIVE_CHALLENGE_STATUSES)[number];

const directTransitions: Record<Exclude<LiveChallengeStatus, 'PAUSED'>, readonly LiveChallengeStatus[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['LOBBY', 'CANCELLED'],
  LOBBY: ['QUESTION_ACTIVE', 'PAUSED', 'CANCELLED'],
  QUESTION_ACTIVE: ['ANSWERS_LOCKED', 'PAUSED', 'CANCELLED'],
  ANSWERS_LOCKED: ['PEER_MARKING', 'PAUSED', 'CANCELLED'],
  PEER_MARKING: ['ROUND_RESULTS', 'PAUSED', 'CANCELLED'],
  ROUND_RESULTS: ['QUESTION_ACTIVE', 'FINISHED', 'PAUSED', 'CANCELLED'],
  FINISHED: [],
  CANCELLED: [],
};

export class LiveChallengeTransitionError extends Error {
  constructor(
    public readonly from: LiveChallengeStatus,
    public readonly to: LiveChallengeStatus,
  ) {
    super(`invalid_live_challenge_transition:${from}->${to}`);
  }
}

export function canTransitionLiveChallenge(
  from: LiveChallengeStatus,
  to: LiveChallengeStatus,
  pausedFromStatus: LiveChallengeStatus | null = null,
): boolean {
  if (from === 'PAUSED') {
    return pausedFromStatus !== null && pausedFromStatus !== 'PAUSED' && to === pausedFromStatus;
  }
  return directTransitions[from].includes(to);
}

export function assertLiveChallengeTransition(
  from: LiveChallengeStatus,
  to: LiveChallengeStatus,
  pausedFromStatus: LiveChallengeStatus | null = null,
): void {
  if (!canTransitionLiveChallenge(from, to, pausedFromStatus)) {
    throw new LiveChallengeTransitionError(from, to);
  }
}

export function studentCanSeeMarkScheme(status: LiveChallengeStatus): boolean {
  return status === 'PEER_MARKING' || status === 'ROUND_RESULTS' || status === 'FINISHED';
}

export function studentCanSeeCurrentQuestion(status: LiveChallengeStatus): boolean {
  return (
    status === 'QUESTION_ACTIVE' ||
    status === 'ANSWERS_LOCKED' ||
    status === 'PEER_MARKING' ||
    status === 'ROUND_RESULTS' ||
    status === 'FINISHED'
  );
}

export interface LiveChallengeStudentProjectionInput<TQuestion, TMarkScheme> {
  status: LiveChallengeStatus;
  question: TQuestion | null;
  markScheme: TMarkScheme | null;
}

export interface LiveChallengeStudentProjection<TQuestion, TMarkScheme> {
  status: LiveChallengeStatus;
  question: TQuestion | null;
  markScheme: TMarkScheme | null;
}

export function projectLiveChallengeForStudent<TQuestion, TMarkScheme>(
  input: LiveChallengeStudentProjectionInput<TQuestion, TMarkScheme>,
): LiveChallengeStudentProjection<TQuestion, TMarkScheme> {
  return {
    status: input.status,
    question: studentCanSeeCurrentQuestion(input.status) ? input.question : null,
    markScheme: studentCanSeeMarkScheme(input.status) ? input.markScheme : null,
  };
}

export interface PeerAnswerIdentity {
  answerId: string;
  studentId: string;
}

export interface PeerAssignmentIdentity {
  markerStudentId: string;
  answerId: string;
  answerStudentId: string;
}

export class LiveChallengePeerAssignmentError extends Error {
  constructor(public readonly code: 'not_enough_answers' | 'duplicate_answer' | 'duplicate_student') {
    super(`live_challenge_peer_assignment:${code}`);
  }
}

function stableSeedScore(seed: string, value: string): number {
  const text = `${seed}:${value}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Build one anonymous peer assignment per submitted answer.
 *
 * Submitted students are deterministically ordered from a round-specific seed,
 * then rotated by one position. The rotation guarantees a derangement for any
 * answer count >= 2, including odd-sized classes, and makes replay/recovery
 * deterministic without relying on browser state.
 */
export function buildLiveChallengePeerAssignments(
  answers: readonly PeerAnswerIdentity[],
  roundSeed: string,
): PeerAssignmentIdentity[] {
  if (answers.length < 2) throw new LiveChallengePeerAssignmentError('not_enough_answers');

  const answerIds = new Set<string>();
  const studentIds = new Set<string>();
  for (const answer of answers) {
    if (answerIds.has(answer.answerId)) throw new LiveChallengePeerAssignmentError('duplicate_answer');
    if (studentIds.has(answer.studentId)) throw new LiveChallengePeerAssignmentError('duplicate_student');
    answerIds.add(answer.answerId);
    studentIds.add(answer.studentId);
  }

  const ordered = [...answers].sort((left, right) => {
    const bySeed = stableSeedScore(roundSeed, left.studentId) - stableSeedScore(roundSeed, right.studentId);
    if (bySeed !== 0) return bySeed;
    return left.studentId.localeCompare(right.studentId);
  });

  return ordered.map((marker, index) => {
    const answer = ordered[(index + 1) % ordered.length];
    return {
      markerStudentId: marker.studentId,
      answerId: answer.answerId,
      answerStudentId: answer.studentId,
    };
  });
}
