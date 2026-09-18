import { Router } from 'express';
import { z } from 'zod';
import type { LiveExamControlService } from '../services/live-exam-control-service.js';

const uuid = z.string().uuid();
const expectedVersion = z.number().int().positive();
const id = (params: Record<string, unknown>) => uuid.parse(params.id);
const versionBody = z.object({ expectedVersion }).strict();

/**
 * Canonical teacher-control surface for Cambridge Live Challenge.
 *
 * Frontend cutover is complete: every teacher-controlled state transition is
 * now versioned and fails closed when the caller does not send the authoritative
 * snapshot version. The legacy service remains mounted for non-control runtime
 * operations only; matching control paths are consumed here.
 */
export function createLiveExamControlRouter(service: LiveExamControlService) {
  const router = Router();

  router.post('/:id/open-room', async (req, res) => {
    const body = versionBody.parse(req.body ?? {});
    res.json(await service.openRoom(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/start', async (req, res) => {
    const body = versionBody.parse(req.body ?? {});
    res.json(await service.start(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/answers/lock', async (req, res) => {
    const body = versionBody.parse(req.body ?? {});
    res.json(await service.lockAnswers(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/mark-scheme/reveal', async (req, res) => {
    const body = versionBody.parse(req.body ?? {});
    res.json(await service.revealMarkScheme(req.actor!, id(req.params), body.expectedVersion));
  });

  // Peer/self recovery is never implicit. The teacher must explicitly switch
  // the locked round to teacher marking and provide a human-readable reason,
  // which the service records in the versioned audit event.
  router.post('/:id/marking/switch-to-teacher', async (req, res) => {
    const body = z.object({
      expectedVersion,
      reason:z.string().trim().min(3).max(500),
    }).strict().parse(req.body ?? {});
    res.json(await service.switchMarkingToTeacher(
      req.actor!,id(req.params),body.expectedVersion,body.reason,
    ));
  });

  // Retain the route name only as a strict compatibility alias for callers that
  // have already separated locking from reveal. It no longer permits the old
  // versionless combined transition.
  router.post('/:id/reveal', async (req, res) => {
    const body = versionBody.parse(req.body ?? {});
    res.json(await service.revealMarkScheme(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/marking/complete', async (req, res) => {
    const body = z.object({
      expectedVersion,
      force:z.boolean().default(false),
    }).strict().parse(req.body ?? {});
    res.json(await service.completeMarking(
      req.actor!,id(req.params),body.expectedVersion,body.force,
    ));
  });

  router.post('/:id/next', async (req, res) => {
    const body = versionBody.parse(req.body ?? {});
    res.json(await service.nextQuestion(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/pause', async (req, res) => {
    const body = versionBody.parse(req.body ?? {});
    res.json(await service.pause(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/resume', async (req, res) => {
    const body = versionBody.parse(req.body ?? {});
    res.json(await service.resume(req.actor!, id(req.params), body.expectedVersion));
  });

  router.post('/:id/cancel', async (req, res) => {
    const body = versionBody.parse(req.body ?? {});
    res.json(await service.cancel(req.actor!, id(req.params), body.expectedVersion));
  });

  return router;
}
