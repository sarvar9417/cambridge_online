import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
import type { LiveExamService } from './live-exam-service.js';

/**
 * Teacher-authorised, learner-safe projector projection.
 *
 * The ordinary staff snapshot intentionally contains participant identities,
 * answer text and moderation state. A classroom board must never inherit that
 * payload by accident, so this service projects an explicit allow-list.
 */
export class LiveExamBoardService {
  constructor(private readonly liveExam: LiveExamService) {}

  async board(actor: Actor, sessionId: string) {
    if (actor.role === 'student') throw new DomainError('staff_only', 403);
    const snapshot = await this.liveExam.snapshot(actor, sessionId);
    const { session } = snapshot;
    const reveal = ['marking','review','finished'].includes(String(session.status));

    return {
      session: {
        id: session.id,
        title: session.title,
        className: session.className,
        status: session.status,
        version: session.version,
        joinCode: session.status === 'lobby' ? session.joinCode : null,
        currentQuestionIndex: session.currentQuestionIndex,
        questionCount: session.questionCount,
        participantCount: session.participantCount,
        submittedCount: session.submittedCount,
        reviewCount: session.reviewCount,
        reviewedCount: session.reviewedCount,
        questionStartedAt: session.questionStartedAt,
        deadline: session.deadline,
        serverNow: session.serverNow,
      },
      question: ['question_open','marking','review'].includes(String(session.status))
        ? snapshot.question
        : null,
      markScheme: reveal ? snapshot.markScheme : null,
    };
  }
}
