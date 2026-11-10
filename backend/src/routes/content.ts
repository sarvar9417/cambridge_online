import { Router } from 'express';
import { z } from 'zod';
import { ContentService } from '../services/content-service.js';

const courseCode = z.enum(['9618', '0478']);
const chapterNo = z.number().int().min(1).max(20);

export function createContentRouter(service: ContentService) {
  const router = Router();

  router.get('/', async (req, res) => res.json({ data: await service.list(req.actor!) }));
  router.get('/games', async (req, res) => res.json({ data: await service.games(req.actor!) }));

  // Unlike the legacy /games endpoint, these routes are chapter/section scoped.
  // They read the latest glossary and Hodder section links on every request.
  // Accept known query fields from the actual URL, not the entire req.query
  // object. On Vercel/Express, unexpected transport query keys previously
  // produced a 400 in the strict Zod object parser before SQL was reached.
  // Explicitly reject invalid syllabus codes while ignoring unrelated keys.
  router.get('/interactive-games/catalog', async (req, res) => {
    const params = new URL(req.originalUrl, 'http://localhost').searchParams;
    const code = courseCode.parse(params.get('courseCode') ?? '9618');
    res.json({ data: await service.interactiveGameCatalog(req.actor!, code) });
  });
  // Legacy single-chapter route is preserved for older clients.
  router.get('/interactive-games/pack', async (req, res) => {
    const params = new URL(req.originalUrl, 'http://localhost').searchParams;
    const query = z.object({
      courseCode: courseCode.default('9618'),
      chapterNo: z.coerce.number().int().min(1).max(20),
      sectionCode: z.string().regex(/^\d+(?:\.\d+)*$/).max(24).optional(),
    }).parse({
      courseCode: params.get('courseCode') ?? '9618',
      chapterNo: params.get('chapterNo') ?? undefined,
      sectionCode: params.get('sectionCode') ?? undefined,
    });
    res.json({ data: await service.interactiveGamePack(req.actor!, query) });
  });
  const gameScope = z.object({
    chapterNo: z.number().int().min(1).max(20),
    kind: z.enum(['chapter', 'topic', 'section']),
    code: z.string().regex(/^\d+(?:\.\d+)*$/).max(24).optional(),
  }).strict().superRefine((scope, context) => {
    if ((scope.kind === 'chapter' && scope.code !== undefined) ||
        (scope.kind !== 'chapter' && !scope.code)) {
      context.addIssue({ code: 'custom', message: 'Invalid chapter/topic/section selection' });
    }
  });
  router.post('/interactive-games/collection', async (req, res) => {
    const body = z.object({
      courseCode: courseCode.default('9618'),
      scopes: z.array(gameScope).min(1).max(100),
    }).strict().parse(req.body);
    res.json({ data: await service.interactiveGameCollection(req.actor!, body) });
  });

  // Student-owned formative history. These self-reported outcomes never
  // populate official grades or mastery records.
  const practiceMode = z.enum([
    'match-up','flash-cards','speaking-cards','spin-wheel',
    'open-box','quiz','find-the-match','anagram',
  ]);
  router.get('/interactive-games/practice', async (req, res) => {
    const params = new URL(req.originalUrl, 'http://localhost').searchParams;
    const code = courseCode.parse(params.get('courseCode') ?? '9618');
    res.json({ data: await service.interactiveGamePracticeHistory(req.actor!, code) });
  });
  router.post('/interactive-games/practice', async (req, res) => {
    const body = z.object({
      runId: z.string().uuid(),
      courseCode: courseCode.default('9618'),
      mode: practiceMode,
      scopes: z.array(gameScope).min(1).max(100),
      durationSeconds: z.number().int().min(0).max(86400),
      correctFirstAttempts: z.number().int().min(0).max(500),
      incorrectFirstAttempts: z.number().int().min(0).max(500),
      reviewedCount: z.number().int().min(0).max(500),
      attempts: z.array(z.object({
        termId: z.string().uuid(), firstCorrect: z.boolean(),
        evidenceType: z.enum(['scored_response','self_rating']),
      }).strict()).max(500),
    }).strict().superRefine((input, context) => {
      const seen = new Set(input.attempts.map((item) => item.termId));
      if (seen.size !== input.attempts.length) context.addIssue({
        code: 'custom', path: ['attempts'], message: 'Duplicate glossary term attempts',
      });
    }).parse(req.body);
    res.json({ data: await service.saveInteractiveGamePractice(req.actor!, body) });
  });

  router.get('/lessons/progress', async (req, res) => {
    res.json({ data: await service.lessonProgress(req.actor!) });
  });
  router.put('/lessons/progress', async (req, res) => {
    const body = z.object({
      courseCode: courseCode.default('9618'),
      chapterNo,
      slideId: z.string().trim().min(1).max(160),
      completed: z.boolean().default(false),
    }).strict().parse(req.body);
    res.json(await service.touchLesson(req.actor!, {
      courseCode: body.courseCode,
      chapterNo: body.chapterNo,
      slideId: body.slideId,
      completed: body.completed,
    }));
  });

  router.get('/flashcards/due', async (req, res) => res.json({ data: await service.due(req.actor!) }));
  router.post('/flashcards/:id/review', async (req, res) => {
    const body = z.object({ grade:z.number().int().min(0).max(5) }).parse(req.body);
    res.json(await service.review(req.actor!, z.string().uuid().parse(req.params.id), body.grade));
  });

  return router;
}
