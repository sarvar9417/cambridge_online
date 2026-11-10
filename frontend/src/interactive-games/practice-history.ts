import type { GameKind, GamePair } from './game-content';
import type { AnswerReview } from './game-session';
import type { GameScope } from './remote-games';

export interface PracticeAttempt {
  termId: string;
  firstCorrect: boolean;
  evidenceType: 'scored_response' | 'self_rating';
}
export interface PracticeRun {
  runId: string;
  mode: GameKind;
  correctFirstAttempts: number;
  incorrectFirstAttempts: number;
  reviewedCount: number;
  durationSeconds: number;
  createdAt: string;
}
export interface PracticeHistory {
  assessed: false;
  recent: PracticeRun[];
  needsReviewIds: string[];
  dueReviewIds: string[];
}
export interface SavePracticeRequest {
  runId: string;
  courseCode: '9618' | '0478';
  mode: GameKind;
  scopes: GameScope[];
  durationSeconds: number;
  correctFirstAttempts: number;
  incorrectFirstAttempts: number;
  reviewedCount: number;
  attempts: PracticeAttempt[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** No free-text answers are saved. Map the first recorded answer for each
 * valid glossary UUID; revealed cards never masquerade as answered questions.
 */
export function practiceAttempts(answers: readonly AnswerReview[], pairs: readonly GamePair[],
  evidenceType: PracticeAttempt['evidenceType'] = 'scored_response'): PracticeAttempt[] {
  const eligible = new Set(pairs.map((pair) => pair.id.toLowerCase()));
  const seen = new Set<string>();
  const attempts: PracticeAttempt[] = [];
  for (const answer of answers) {
    const raw = answer.id.startsWith('quiz-') ? answer.id.slice('quiz-'.length) : answer.id;
    const termId = raw.toLowerCase();
    if (!UUID_PATTERN.test(termId) || !eligible.has(termId) || seen.has(termId)) continue;
    seen.add(termId);
    attempts.push({ termId, firstCorrect: answer.correct, evidenceType });
  }
  return attempts;
}

/** The queue is derived from the latest submitted first attempt for each term
 * by the server. This is a revision hint, not a mastery assessment.
 */
export function missedPracticePairs<T extends GamePair>(
  pairs: readonly T[], needsReviewIds: readonly string[],
): T[] {
  const needsReview = new Set(needsReviewIds.map((id) => id.toLowerCase()));
  return pairs.filter((pair) => needsReview.has(pair.id.toLowerCase()));
}
