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

  it('accepts Cambridge 0478 catalogue, chapter and multi-chapter game selections', async () => {
    const { app, service } = setup();
    const catalogue = await request(app).get('/content/interactive-games/catalog?courseCode=0478');
    expect(catalogue.status).toBe(200);
    expect(service.interactiveGameCatalog).toHaveBeenCalledWith(undefined, '0478');

    const chapter = await request(app).get('/content/interactive-games/pack?courseCode=0478&chapterNo=3&sectionCode=3.1.2');
    expect(chapter.status).toBe(200);
    expect(service.interactiveGamePack).toHaveBeenCalledWith(undefined, {
      courseCode: '0478', chapterNo: 3, sectionCode: '3.1.2',
    });

    const body = { courseCode: '0478', scopes: [
      { chapterNo: 1, kind: 'chapter' },
      { chapterNo: 2, kind: 'topic', code: '2.1' },
      { chapterNo: 3, kind: 'section', code: '3.1.2' },
    ] };
    const collection = await request(app).post('/content/interactive-games/collection').send(body);
    expect(collection.status).toBe(200);
    expect(service.interactiveGameCollection).toHaveBeenCalledWith(undefined, body);
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
