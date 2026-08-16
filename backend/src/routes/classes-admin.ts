import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../lib/validation.js';
import { requireRoles } from '../middleware/auth.js';
import type { ClassesService } from '../services/classes-service.js';

const classInput = z.object({
  name: z.string().trim().min(1).max(80),
  level: z.enum(['AS', 'A2']),
  academicYear: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Academic year looks like 2026/2027'),
  grade: z.number().int().min(1).max(13).nullable().optional(),
}).strict();

const rolloverInput = z.object({
  academicYear: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Academic year looks like 2026/2027'),
  name: z.string().trim().min(1).max(80).optional(),
  grade: z.number().int().min(1).max(13).nullable().optional(),
}).strict();

const uuid = z.string().uuid();
const id = (params: Record<string, unknown>, key = 'id') => uuid.parse(params[key]);

/**
 * Running a class, as opposed to reading one.
 *
 * Owners and teachers both, because a teacher who cannot create their own class
 * has to ask for one every September. Creating makes the creator its owner and
 * a teacher of it; everything after that checks membership, so a teacher can
 * only touch a class they own or teach.
 */
export function createClassesAdminRouter(service: ClassesService) {
  const router = Router();
  /*
   * Guarded per route, never with router.use. This router mounts on the same
   * path as the read-only one and passes unmatched requests through, so a
   * router-wide guard would answer 403 to a student listing their own classes
   * before the read router ever saw it.
   */
  const staff = requireRoles('owner', 'teacher');

  router.post('/', staff, validateBody(classInput), async (req, res) =>
    res.status(201).json({ class: await service.create(req.actor!, req.body) }));

  router.get('/unassigned-students', staff, async (req, res) =>
    res.json({ students: await service.unassignedStudents(req.actor!) }));

  router.get('/:id/roster', staff, async (req, res) =>
    res.json({ roster: await service.roster(req.actor!, id(req.params)) }));

  router.patch('/:id', staff, validateBody(classInput.partial()), async (req, res) =>
    res.json({ class: await service.update(req.actor!, id(req.params), req.body) }));

  router.post('/:id/archive', staff, async (req, res) =>
    res.json({ class: await service.setArchived(req.actor!, id(req.params), true) }));

  router.post('/:id/unarchive', staff, async (req, res) =>
    res.json({ class: await service.setArchived(req.actor!, id(req.params), false) }));

  router.post('/:id/rollover', staff, validateBody(rolloverInput), async (req, res) =>
    res.status(201).json({ class: await service.rollover(req.actor!, id(req.params), req.body) }));

  router.post('/:id/teachers', staff, validateBody(z.object({ teacherId: uuid }).strict()), async (req, res) =>
    res.json(await service.addTeacher(req.actor!, id(req.params), req.body.teacherId)));

  router.delete('/:id/teachers/:teacherId', staff, async (req, res) =>
    res.json(await service.removeTeacher(req.actor!, id(req.params), id(req.params, 'teacherId'))));

  // Placing rather than adding: a student has one class, so this moves them out
  // of whichever one they were in.
  router.post('/:id/students', staff, validateBody(z.object({ studentId: uuid }).strict()), async (req, res) =>
    res.json(await service.placeStudent(req.actor!, id(req.params), req.body.studentId)));

  router.delete('/:id/students/:studentId', staff, async (req, res) =>
    res.json(await service.removeStudent(req.actor!, id(req.params), id(req.params, 'studentId'))));

  return router;
}
