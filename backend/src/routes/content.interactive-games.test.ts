import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { createContentRouter } from './content.js';
import type { ContentService } from '../services/content-service.js';

function setup() {
  const service = {
    interactiveGameCatalog: vi.fn(async () => ({ courseCode: '9618', chapters: [] })),
    interactiveGamePack: vi.fn(async () => ({ courseCode: '9618', pairs: [] })),
    interactiveGameCollection: vi.fn(async () => ({ courseCode: '9618', scopes: [], pairs: [] })),
    interactiveGamePracticeHistory: vi.fn(async () => ({ assessed: false, recent: [], needsReviewIds: [] })),
    saveInteractiveGamePractice: vi.fn(async () => ({ saved: true, assessed: false })),
  };
  const app = express();
  app.use(express.json());
  app.use((_req, _res, next) => next());
  app.use('/content', createContentRouter(service as unknown as ContentService));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) { res.status(400).json({ error: { code: 'validation_error' } }); return; }
    res.status(500).json({ error: { code: 'unexpected_error' } });
  });
  return { app, service };
}

describe('Interactive Games live API route validation', () => {
  it('returns 200 for the exact production catalog URL and ignores unrelated tracking query keys', async () => {
    const { app, service } = setup();
    const result = await request(app).get('/content/interactive-games/catalog?courseCode=9618');
    expect(result.status).toBe(200);
    expect(result.body.data.chapters).toEqual([]);
    expect(service.interactiveGameCatalog).toHaveBeenCalledWith(undefined, '9618');

    const tracked = await request(app).get('/content/interactive-games/catalog?courseCode=9618&test=1');
    expect(tracked.status).toBe(200);
    expect(service.interactiveGameCatalog).toHaveBeenCalledTimes(2);
  });

  it('does not accept invalid syllabus codes', async () => {
    const { app } = setup();
    const result = await request(app).get('/content/interactive-games/catalog?courseCode=9999');
    expect(result.status).toBe(400);
  });

  it('preserves legacy pack while accepting a validated multi-chapter POST', async () => {
    const { app, service } = setup();
    const old = await request(app).get('/content/interactive-games/pack?chapterNo=1&extra=ignore');
    expect(old.status).toBe(200);
    expect(service.interactiveGamePack).toHaveBeenCalledWith(undefined, {
      courseCode: '9618', chapterNo: 1, sectionCode: undefined,
    });
    const body = {
      courseCode: '9618',
      scopes: [
        { chapterNo: 1, kind: 'chapter' },
        { chapterNo: 2, kind: 'topic', code: '2.1' },
        { chapterNo: 3, kind: 'section', code: '3.1.1' },
      ],
    };
    const result = await request(app).post('/content/interactive-games/collection').send(body);
    expect(result.status).toBe(200);
    expect(service.interactiveGameCollection).toHaveBeenCalledWith(undefined, body);
  });

  it('saves student practice-only results and reads private study history with strict input', async () => {
    const { app, service } = setup();
    const runId = 'c8ae5926-f657-4133-93d2-6a7295290c25';
    const termId = '302745c8-0397-4ec2-ac0a-a0b65cef1fb1';
    const body = {
      runId, courseCode: '9618', mode: 'quiz',
      scopes: [{ chapterNo: 17, kind: 'chapter' }],
      durationSeconds: 72, correctFirstAttempts: 3,
      incorrectFirstAttempts: 1, reviewedCount: 0,
      attempts: [{ termId, firstCorrect: false }],
    };
    const save = await request(app).post('/content/interactive-games/practice').send(body);
    expect(save.status).toBe(200);
    expect(save.body.data.assessed).toBe(false);
    expect(service.saveInteractiveGamePractice).toHaveBeenCalledWith(undefined, body);
    const history = await request(app).get('/content/interactive-games/practice?courseCode=9618');
    expect(history.status).toBe(200);
    expect(history.body.data.assessed).toBe(false);
    expect(service.interactiveGamePracticeHistory).toHaveBeenCalledWith(undefined, '9618');
  });

  it('rejects malformed IDs, duplicate attempts, spoofed fields and excessive practice payloads', async () => {
    const { app, service } = setup();
    const base = {
      runId: 'c8ae5926-f657-4133-93d2-6a7295290c25',
      mode: 'quiz', scopes: [{ chapterNo: 17, kind: 'chapter' }],
      durationSeconds: 20, correctFirstAttempts: 0,
      incorrectFirstAttempts: 1, reviewedCount: 0,
      attempts: [{ termId: '302745c8-0397-4ec2-ac0a-a0b65cef1fb1', firstCorrect: false }],
    };
    for (const invalid of [
      { ...base, runId: 'not-a-uuid' },
      { ...base, attempts: [...base.attempts, ...base.attempts] },
      { ...base, officialGrade: 100 },
      { ...base, correctFirstAttempts: 1000 },
      { ...base, attempts: [{ termId: 'not-valid', firstCorrect: false }] },
      { ...base, mode: 'unapproved-game' },
      { ...base, scopes: [] },
      { ...base, durationSeconds: -1 },
    ]) {
      const response = await request(app).post('/content/interactive-games/practice').send(invalid);
      expect(response.status).toBe(400);
    }
    expect(service.saveInteractiveGamePractice).not.toHaveBeenCalled();
  });

  it('rejects unknown kinds, no selections, and malformed subtopic codes', async () => {
    const { app, service } = setup();
    const bad = [
      { scopes: [] },
      { scopes: [{ chapterNo: 1, kind: 'topic', code: 'invalid' }] },
      { scopes: [{ chapterNo: 1, kind: 'arbitrary' }] },
      { scopes: [{ chapterNo: 1, kind: 'chapter', code: '1.1' }] },
    ];
    for (const input of bad) {
      const response = await request(app).post('/content/interactive-games/collection')
        .send({ courseCode: '9618', ...input });
      expect(response.status).toBe(400);
    }
    expect(service.interactiveGameCollection).not.toHaveBeenCalled();
  });
});
