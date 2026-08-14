import { Router } from 'express';
import { z } from 'zod';
import type { EnrolmentService } from '../services/enrolment-service.js';

const uuid = z.string().uuid();

const assignSchema = z.object({
  classId: uuid,
  groupId: uuid.nullable().optional(),
});

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const statusSchema = z.object({ status: z.enum(['active', 'suspended']) });

export function createEnrolmentRouter(service: EnrolmentService) {
  const router = Router();

  router.get('/students/pending', async (req, res) => {
    res.json({ data: await service.pendingStudents(req.actor!) });
  });

  router.post('/students/:id/assign', async (req, res) => {
    const body = assignSchema.parse(req.body);
    res.json(await service.assignStudent(req.actor!, uuid.parse(req.params.id), body));
  });

  router.post('/students/:id/status', async (req, res) => {
    const body = statusSchema.parse(req.body);
    res.json(await service.setStatus(req.actor!, uuid.parse(req.params.id), body.status));
  });

  router.get('/classes/:classId/roster', async (req, res) => {
    res.json({ data: await service.roster(req.actor!, uuid.parse(req.params.classId)) });
  });

  router.get('/classes/:classId/groups', async (req, res) => {
    res.json({ data: await service.groups(req.actor!, uuid.parse(req.params.classId)) });
  });

  router.post('/classes/:classId/groups', async (req, res) => {
    const body = createGroupSchema.parse(req.body);
    res
      .status(201)
      .json(
        await service.createGroup(
          req.actor!,
          uuid.parse(req.params.classId),
          body.name,
          body.sortOrder,
        ),
      );
  });

  return router;
}
