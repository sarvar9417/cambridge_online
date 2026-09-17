import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamControlService } from '../services/live-exam-control-service.js';

const uuid = z.string().uuid();
const expectedVersion = z.number().int().positive();
const id = (params: Record<string, unknown>) => uuid.parse(params.id);

function transitionVersion(body: unknown) {
  const parsed = z.object({ expectedVersion:expectedVersion.optional() }).passthrough().parse(body ?? {});
  return parsed.expectedVersion;
}

/**
 * Version-aware teacher controls mount before the legacy live-exams router.
 * Existing clients without expectedVersion deliberately fall through during
 * the migration window; new clients use the locked/CAS state machine here.
 */
export function createLiveExamControlRouter(service: LiveExamControlService) {
  const router = Router();

  router.post('/:id/open-room', async (req, res) => {
    const body = z.object({ expectedVersion }).strict().parse(req.body ?? {});
    res.json(await service.openRoom(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/start', async (req, res, next) => {
    const version = transitionVersion(req.body);
    if (version === undefined) { next(); return; }
    res.json(await service.start(req.actor!, id(req.params), version));
  });

  router.post('/:id/answers/lock', async (req, res) => {
    const body = z.object({ expectedVersion }).strict().parse(req.body ?? {});
    res.json(await service.lockAnswers(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/mark-scheme/reveal', async (req, res) => {
    const body = z.object({ expectedVersion }).strict().parse(req.body ?? {});
    res.json(await service.revealMarkScheme(req.actor!, id(req.params), body.expectedVersion));
  });

  // Keep the public route stable for the frontend migration: once a client
  // supplies expectedVersion, /reveal means reveal an already locked round.
  router.post('/:id/reveal', async (req, res, next) => {
    const version = transitionVersion(req.body);
    if (version === undefined) { next(); return; }
    res.json(await service.revealMarkScheme(req.actor!, id(req.params), version));
  });

  router.post('/:id/marking/complete', async (req, res, next) => {
    const body = z.object({
      expectedVersion:expectedVersion.optional(),
      force:z.boolean().default(false),
    }).strict().parse(req.body ?? {});
    if (body.expectedVersion === undefined) { next(); return; }
    res.json(await service.completeMarking(
      req.actor!,id(req.params),body.expectedVersion,body.force,
    ));
  });

  router.post('/:id/next', async (req, res, next) => {
    const version = transitionVersion(req.body);
    if (version === undefined) { next(); return; }
    res.json(await service.nextQuestion(req.actor!, id(req.params), version));
  });

  router.post('/:id/pause', async (req, res) => {
    const body = z.object({ expectedVersion }).strict().parse(req.body ?? {});
    res.json(await service.pause(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/resume', async (req, res) => {
    const body = z.object({ expectedVersion }).strict().parse(req.body ?? {});
    res.json(await service.resume(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/cancel', async (req, res, next) => {
    const version = transitionVersion(req.body);
    if (version === undefined) { next(); return; }
    res.json(await service.cancel(req.actor!, id(req.params), version));
  });

  return router;
}
