import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { PgSelectionsRepository } from './repositories/selections-repository.js';
import type { SelectionAssignmentService } from './services/selection-assignment-service.js';
import type { AssignmentsService } from './services/assignments-service.js';
import type { GradingService } from './services/grading-service.js';
import type { ResultsService } from './services/results-service.js';
import type { AnalyticsService } from './services/analytics-service.js';
import { createSelectionsRouter } from './routes/selections.js';
import { createAssignmentsRouter } from './routes/assignments.js';
import { createGradingRouter } from './routes/grading.js';
import { createResultsRouter } from './routes/results.js';
import { createAnalyticsRouter } from './routes/analytics.js';

const selectionId = '11111111-1111-4111-8111-111111111111';
const questionId = '22222222-2222-4222-8222-222222222222';
const classId = '33333333-3333-4333-8333-333333333333';
const assignmentId = '44444444-4444-4444-8444-444444444444';
const submissionId = '55555555-5555-4555-8555-555555555555';
const gradingId = '66666666-6666-4666-8666-666666666666';
const subtopicId = '77777777-7777-4777-8777-777777777777';
const activeSessionId = '88888888-8888-4888-8888-888888888888';

const teacher = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  role: 'teacher' as const,
  schoolId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  fullName: 'Teacher One',
};
const student = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  role: 'student' as const,
  schoolId: teacher.schoolId,
  fullName: 'Student One',
};

type FlowState = {
  selectedQuestionId: string | null;
  assignmentCreated: boolean;
  answerText: string | null;
  submitted: boolean;
  score: number | null;
  released: boolean;
};

/**
 * Release-level HTTP regression for the product's core academic identity chain.
 *
 * This deliberately composes the real route contracts while keeping persistence
 * deterministic in-memory. Lower-level repository/service tests remain responsible
 * for SQL details; this test protects the cross-domain handoff itself from drift.
 */
describe('release closed-loop academic identity contract', () => {
  it('preserves one selected Cambridge question through assignment, submission, grading, result and mastery', async () => {
    const state: FlowState = {
      selectedQuestionId: null,
      assignmentCreated: false,
      answerText: null,
      submitted: false,
      score: null,
      released: false,
    };

    const addItem = vi.fn(async (_actor, receivedSelectionId: string, receivedQuestionId: string, role: string) => {
      expect(receivedSelectionId).toBe(selectionId);
      expect(receivedQuestionId).toBe(questionId);
      expect(role).toBe('graded');
      state.selectedQuestionId = receivedQuestionId;
      return { dependencies: [] };
    });

    const createFromSelection = vi.fn(async (_actor, receivedSelectionId: string, input: { classId: string; title: string; publish: boolean }) => {
      expect(receivedSelectionId).toBe(selectionId);
      expect(input.classId).toBe(classId);
      expect(input.publish).toBe(true);
      expect(state.selectedQuestionId).toBe(questionId);
      state.assignmentCreated = true;
      return {
        id: assignmentId,
        title: input.title,
        mode: 'online',
        totalMarks: 4,
        publishedAt: '2026-09-07T08:30:00Z',
        itemCount: 1,
        gradedCount: 1,
        contextOnlyCount: 0,
      };
    });

    const start = vi.fn(async (_actor, receivedAssignmentId: string) => {
      expect(receivedAssignmentId).toBe(assignmentId);
      expect(state.assignmentCreated).toBe(true);
      expect(state.selectedQuestionId).toBe(questionId);
      return {
        submissionId,
        assignmentId,
        activeSessionId,
        serverNow: '2026-09-07T08:31:00Z',
        deadline: null,
        questions: [{
          id: questionId,
          displayRef: '9618/12/M/J/26 Q2(a)',
          stem: 'Explain why the value changes.',
          marks: 4,
          answerText: '',
        }],
      };
    });

    const saveAnswer = vi.fn(async (_actor, receivedSubmissionId: string, receivedQuestionId: string, text: string) => {
      expect(receivedSubmissionId).toBe(submissionId);
      expect(receivedQuestionId).toBe(questionId);
      state.answerText = text;
      return { ok: true };
    });

    const submit = vi.fn(async (_actor, receivedSubmissionId: string) => {
      expect(receivedSubmissionId).toBe(submissionId);
      expect(state.answerText).toBe('Because the state is recalculated from the new input.');
      state.submitted = true;
      return { id: submissionId, status: 'submitted' };
    });

    const queue = vi.fn(async () => {
      expect(state.submitted).toBe(true);
      return [{
        id: gradingId,
        submissionId,
        questionId,
        displayRef: '9618/12/M/J/26 Q2(a)',
        maxMarks: 4,
        finalScore: state.score,
      }];
    });

    const setScore = vi.fn(async (_actor, receivedGradingId: string, score: number) => {
      expect(receivedGradingId).toBe(gradingId);
      state.score = score;
      return { id: gradingId, finalScore: score };
    });

    const release = vi.fn(async (_actor, receivedGradingId: string) => {
      expect(receivedGradingId).toBe(gradingId);
      expect(state.score).toBe(2);
      state.released = true;
      return { id: gradingId, releasedAt: '2026-09-07T08:40:00Z' };
    });

    const detail = vi.fn(async (_actor, receivedSubmissionId: string) => {
      expect(receivedSubmissionId).toBe(submissionId);
      expect(state.released).toBe(true);
      return [{
        gradingId,
        questionId,
        displayRef: '9618/12/M/J/26 Q2(a)',
        stemMd: 'Explain why the value changes.',
        marks: 4,
        answerText: state.answerText,
        finalScore: state.score,
        feedback: 'Develop the explanation.',
        points: [],
        contentJson: null,
        contentVersion: null,
        assetUrls: {},
        practiceTargets: [{ subtopicId, code: '1.2', title: 'Data representation' }],
      }];
    });

    const mastery = vi.fn(async () => {
      expect(state.released).toBe(true);
      return [{
        subtopic_id: subtopicId,
        code: '1.2',
        title: 'Data representation',
        mastery: 50,
        evidence: 1,
      }];
    });

    const selectionsRepository = { addItem } as unknown as PgSelectionsRepository;
    const selectionAssignments = { create: createFromSelection } as unknown as SelectionAssignmentService;
    const assignmentsService = { start, saveAnswer, submit } as unknown as AssignmentsService;
    const gradingService = { queue, setScore, release } as unknown as GradingService;
    const resultsService = { detail } as unknown as ResultsService;
    const analyticsService = { mastery } as unknown as AnalyticsService;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.actor = req.get('x-test-actor') === 'student' ? student : teacher;
      next();
    });
    app.use('/selections', createSelectionsRouter(selectionsRepository, selectionAssignments));
    app.use('/assignments', createAssignmentsRouter(assignmentsService));
    app.use('/grading', createGradingRouter(gradingService));
    app.use('/results', createResultsRouter(resultsService));
    app.use('/analytics', createAnalyticsRouter(analyticsService));

    await request(app)
      .post(`/selections/${selectionId}/items`)
      .send({ questionId, role: 'graded' })
      .expect(201);

    const created = await request(app)
      .post(`/selections/${selectionId}/assignment`)
      .send({ classId, title: 'Cambridge 9618 release loop', mode: 'online', publish: true })
      .expect(201);
    expect(created.body.id).toBe(assignmentId);

    const attempt = await request(app)
      .post(`/assignments/${assignmentId}/attempt`)
      .set('x-test-actor', 'student')
      .send({})
      .expect(201);
    expect(attempt.body.questions).toHaveLength(1);
    expect(attempt.body.questions[0].id).toBe(questionId);
    expect(attempt.body.questions[0].displayRef).toBe('9618/12/M/J/26 Q2(a)');

    await request(app)
      .put(`/assignments/submissions/${submissionId}/answers/${questionId}`)
      .set('x-test-actor', 'student')
      .send({ text: 'Because the state is recalculated from the new input.', activeSessionId })
      .expect(200);

    await request(app)
      .post(`/assignments/submissions/${submissionId}/submit`)
      .set('x-test-actor', 'student')
      .send({})
      .expect(200);

    const gradingQueue = await request(app).get('/grading/queue').expect(200);
    expect(gradingQueue.body.data[0]).toMatchObject({
      id: gradingId,
      submissionId,
      questionId,
      displayRef: '9618/12/M/J/26 Q2(a)',
    });

    await request(app)
      .patch(`/grading/${gradingId}/score`)
      .send({ score: 2 })
      .expect(200);

    await request(app)
      .post(`/grading/${gradingId}/release`)
      .send({})
      .expect(200);

    const result = await request(app)
      .get(`/results/${submissionId}`)
      .set('x-test-actor', 'student')
      .expect(200);
    expect(result.body.data[0]).toMatchObject({
      gradingId,
      questionId,
      displayRef: '9618/12/M/J/26 Q2(a)',
      finalScore: 2,
      answerText: 'Because the state is recalculated from the new input.',
    });

    const masteryResponse = await request(app)
      .get('/analytics/mastery')
      .set('x-test-actor', 'student')
      .expect(200);
    expect(masteryResponse.body.data[0]).toMatchObject({
      subtopic_id: subtopicId,
      mastery: 50,
      evidence: 1,
    });

    expect(addItem).toHaveBeenCalledOnce();
    expect(createFromSelection).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledOnce();
    expect(saveAnswer).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledOnce();
    expect(setScore).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(detail).toHaveBeenCalledOnce();
    expect(mastery).toHaveBeenCalledOnce();
  });
});
