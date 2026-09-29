import express from 'express';
import request from 'supertest';
import type { Pool } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobRunner } from '../jobs/runner.js';
import { createJobsRouter } from './jobs.js';

const exportId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const jobId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const actor = { id: 'teacher-a', role: 'teacher' as const, schoolId: 'school-a', fullName: 'Teacher' };

function appFor(query: ReturnType<typeof vi.fn>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.actor = actor; next(); });
  app.use('/jobs', createJobsRouter({ query } as unknown as Pool));
  return app;
}

afterEach(() => vi.restoreAllMocks());

describe('interactive export processing', () => {
  it('runs the requested export job instead of an unrelated job ahead in the queue', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: exportId }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: jobId }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const run = vi.spyOn(JobRunner.prototype, 'runOnce').mockResolvedValue(true);
    const response = await request(appFor(query)).post('/jobs/run-once').send({ exportId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ processed: true });
    expect(query.mock.calls[1]?.[1]).toEqual([actor.id, exportId]);
    expect(run).toHaveBeenCalledWith(['export-pdf'], jobId);
  });

  it('does not run another teacher export', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const run = vi.spyOn(JobRunner.prototype, 'runOnce').mockResolvedValue(true);
    const response = await request(appFor(query)).post('/jobs/run-once').send({ exportId });
    expect(response.status).toBe(404);
    expect(query.mock.calls[0]?.[1]).toEqual([exportId, actor.id]);
    expect(run).not.toHaveBeenCalled();
  });

  it('returns without claiming another job if this export is already running or finished', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: exportId }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const run = vi.spyOn(JobRunner.prototype, 'runOnce').mockResolvedValue(true);
    const response = await request(appFor(query)).post('/jobs/run-once').send({ exportId });
    expect(response.body).toEqual({ processed: false });
    expect(run).not.toHaveBeenCalled();
  });
});
