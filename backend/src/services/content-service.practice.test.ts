import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { ContentService } from './content-service.js';

const learner: Actor = {
  id: 'fe4f481b-6a35-4d5e-b802-4f4d9ed36103',
  role: 'student', schoolId: 'school', fullName: 'Learner',
};
const teacher: Actor = { ...learner, role: 'teacher' };
const a = '302745c8-0397-4ec2-ac0a-a0b65cef1fb1';
const b = '94fe437b-f43f-4ad7-a4f5-9fefbcb04ab5';
const runId = 'c8ae5926-f657-4133-93d2-6a7295290c25';

function request(attempts: Array<{termId:string;firstCorrect:boolean;evidenceType:'scored_response'|'self_rating'}> = [
  { termId: a, firstCorrect: false, evidenceType: 'scored_response' }, { termId: b, firstCorrect: true, evidenceType: 'scored_response' },
]) {
  return {
    runId, courseCode: '9618' as const, mode: 'quiz' as const,
    scopes: [{ chapterNo: 17, kind: 'chapter' as const }],
    durationSeconds: 72, correctFirstAttempts: 1,
    incorrectFirstAttempts: 1, reviewedCount: 0,
    attempts,
  };
}

describe('Interactive Games private student practice history', () => {
  it('saves only syllabus-valid UUID outcomes for an enrolled learner and is idempotent', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ present: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ term_count: 2 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: runId, inserted: true, scheduled_count: 2 }] });
    const service = new ContentService({ query } as unknown as Pool);
    expect(await service.saveInteractiveGamePractice(learner, request()))
      .toEqual({ runId, saved: true, alreadySaved: false, assessed: false });
    expect(query).toHaveBeenCalledTimes(3);
    expect(String(query.mock.calls[1]?.[0])).toContain('gt.is_glossary_visible=true');
    expect(query.mock.calls[1]?.[1]).toEqual(['9618', [a, b]]);
    expect(String(query.mock.calls[2]?.[0])).toContain('on conflict (id) do nothing');
    expect(String(query.mock.calls[2]?.[0])).toContain('interactive_game_practice_schedule');
    expect(String(query.mock.calls[2]?.[0])).toContain("interval '10 minutes'");
    expect(String(query.mock.calls[2]?.[0])).toContain("interval '1 day'");
    expect(String(query.mock.calls[2]?.[0])).toContain('with inserted_run as');
    const values = query.mock.calls[2]?.[1] as unknown[];
    expect(values[0]).toBe(runId);
    expect(values[1]).toBe(learner.id);
    expect(values[5]).toBe(JSON.stringify(request().attempts));
    expect(String(values[5])).not.toContain('prompt');
  });

  it('denies teachers and unenrolled learners', async () => {
    const noQueries = vi.fn();
    const service = new ContentService({ query: noQueries } as unknown as Pool);
    await expect(service.saveInteractiveGamePractice(teacher, request()))
      .rejects.toMatchObject({ status: 403 });
    expect(noQueries).not.toHaveBeenCalled();

    const query = vi.fn().mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(new ContentService({ query } as unknown as Pool)
      .saveInteractiveGamePractice(learner, request())).rejects.toMatchObject({ status: 403 });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate attempts and glossary IDs from another syllabus', async () => {
    const duplicates = vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [{}] });
    await expect(new ContentService({ query: duplicates } as unknown as Pool)
      .saveInteractiveGamePractice(learner, request([
        { termId: a, firstCorrect: false, evidenceType: 'scored_response' }, { termId: a, firstCorrect: true, evidenceType: 'scored_response' },
      ]))).rejects.toMatchObject({ status: 400 });
    expect(duplicates).toHaveBeenCalledTimes(1);

    const foreignTerm = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ term_count: 1 }] });
    await expect(new ContentService({ query: foreignTerm } as unknown as Pool)
      .saveInteractiveGamePractice(learner, request())).rejects.toMatchObject({ status: 400 });
    expect(foreignTerm).toHaveBeenCalledTimes(2);
  });

  it('rejects another learner reusing a run UUID without leaking their data', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const service = new ContentService({ query } as unknown as Pool);
    await expect(service.saveInteractiveGamePractice(learner, request([])))
      .rejects.toMatchObject({ status: 409 });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('does not advance SRS intervals when the same practice run is submitted twice', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ term_count: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: runId, inserted: false, scheduled_count: 0 }] });
    const result = await new ContentService({ query } as unknown as Pool)
      .saveInteractiveGamePractice(learner, request([{ termId: a, firstCorrect: true, evidenceType: 'scored_response' }]));
    expect(result).toMatchObject({ alreadySaved: true, assessed: false });
    expect(query).toHaveBeenCalledTimes(3);
    expect(String(query.mock.calls[2]?.[0])).toContain('on conflict (id) do nothing');
  });

  it('loads only the current student history and the most recent independent first attempts', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({ rows: [{
        id: runId, game_kind: 'quiz', correct_first_attempts: 2,
        incorrect_first_attempts: 1, reviewed_count: 0,
        duration_seconds: 62, created_at: '2026-11-10T09:00:00Z',
      }] })
      .mockResolvedValueOnce({ rows: [{ term_id: a }] })
      .mockResolvedValueOnce({ rows: [{ term_id: b }] });
    const history = await new ContentService({ query } as unknown as Pool)
      .interactiveGamePracticeHistory(learner, '9618');
    expect(history).toMatchObject({
      assessed: false,
      needsReviewIds: [a],
      dueReviewIds: [b],
      recent: [{ runId, mode: 'quiz', correctFirstAttempts: 2, incorrectFirstAttempts: 1 }],
    });
    expect(String(query.mock.calls[1]?.[0])).toContain('where student_id=$1 and course_code=$2');
    expect(String(query.mock.calls[2]?.[0])).toContain('distinct on');
    expect(String(query.mock.calls[2]?.[0])).toContain('first_correct=false');
    expect(query.mock.calls[2]?.[1]).toEqual([learner.id, '9618']);
    expect(String(query.mock.calls[3]?.[0])).toContain('interactive_game_practice_schedule');
    expect(String(query.mock.calls[3]?.[0])).toContain('due_at<=now()');
  });
});
