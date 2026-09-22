import { Router } from 'express';
import { z } from 'zod';
import type { PgSelectionsRepository } from '../repositories/selections-repository.js';
import type { SelectionAssignmentService } from '../services/selection-assignment-service.js';
import { runIdempotent } from '../lib/idempotent-request.js';
import type { Pool } from 'pg';
import type { SelectionGeneratorService } from '../services/selection-generator-service.js';

const roleSchema = z.enum(['graded', 'context_only']);
const createSchema = z.object({ name: z.string().trim().min(1).max(120) });
const renameSchema = z.object({ name: z.string().trim().min(1).max(120) });
const itemSchema = z.object({ questionId: z.string().uuid(), role: roleSchema.default('graded') });
const updateItemSchema = z.object({ role: roleSchema });
const reorderSchema = z.object({ itemIds: z.array(z.string().uuid()).min(1).max(250).refine((ids) => new Set(ids).size === ids.length, 'Elementlar takrorlanmasligi kerak.') });
const assignmentSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().min(3).max(120),
  instructions: z.string().max(5000).optional(),
  dueAt: z.string().datetime().optional(),
  timeLimitMin: z.number().int().min(1).max(300).optional(),
  mode: z.enum(['online', 'pdf', 'mock']).default('online'),
  publish: z.boolean().default(false),
});
const generatorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  syllabusCode: z.literal('9618').default('9618'),
  targetMarks: z.number().int().min(1).max(200),
  q: z.string().trim().max(300).optional(),
  component: z.number().int().min(1).max(4).optional(),
  marksMin: z.number().int().min(0).max(100).optional(),
  marksMax: z.number().int().min(0).max(100).optional(),
  yearFrom: z.number().int().min(2021).max(2026).optional(),
  yearTo: z.number().int().min(2021).max(2026).optional(),
  series: z.array(z.enum(['FM','MJ','ON'])).max(3).optional(),
  aos: z.array(z.enum(['AO1','AO2','AO3'])).max(3).optional(),
  topicIds: z.array(z.string().uuid()).max(20).optional(),
  subtopicIds: z.array(z.string().uuid()).max(80).optional(),
  commandWords: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  hasDiagram: z.boolean().optional(),
  dependency: z.enum(['any','independent']).default('any'),
  classId: z.string().uuid().optional(),
  excludeSeen: z.boolean().default(false),
  seed: z.number().int().optional(),
}).superRefine((value,ctx)=>{
  if(value.yearFrom!==undefined&&value.yearTo!==undefined&&value.yearFrom>value.yearTo){
    ctx.addIssue({code:z.ZodIssueCode.custom,path:['yearTo'],message:'Yil oralig‘i noto‘g‘ri.'});
  }
  if(value.marksMin!==undefined&&value.marksMax!==undefined&&value.marksMin>value.marksMax){
    ctx.addIssue({code:z.ZodIssueCode.custom,path:['marksMax'],message:'Ball oralig‘i noto‘g‘ri.'});
  }
  if(value.excludeSeen&&!value.classId){
    ctx.addIssue({code:z.ZodIssueCode.custom,path:['classId'],message:'Ko‘rilgan savollarni chiqarish uchun sinfni tanlang.'});
  }
});
const uuid = z.string().uuid();

export function createSelectionsRouter(
  repository: PgSelectionsRepository,
  assignments?: SelectionAssignmentService,
  pool?: Pool,
  generator?: SelectionGeneratorService,
) {
  const router = Router();

  router.use((req, res, next) => {
    if (req.actor!.role === 'student') {
      res.status(403).json({ error: { code: 'forbidden', message: 'Bu amal faqat o‘qituvchi yoki owner uchun.' } });
      return;
    }
    if (!req.actor!.schoolId) {
      res.status(403).json({ error: { code: 'school_required', message: 'Foydalanuvchi maktabga biriktirilmagan.' } });
      return;
    }
    next();
  });

  router.get('/', async (req, res) => {
    res.json(await repository.list(req.actor!));
  });

  router.post('/', async (req, res) => {
    const body = createSchema.parse(req.body);
    const selection = await repository.create(req.actor!, body.name);
    if (!selection) { res.status(403).json({ error: { code: 'forbidden', message: 'Ruxsat yo‘q.' } }); return; }
    res.status(201).json(selection);
  });

  router.post('/generate', async (req, res) => {
    if (!generator) {
      res.status(503).json({ error: { code: 'selection_generator_unavailable', message: 'Auto paper generator sozlanmagan.' } });
      return;
    }
    const body = generatorSchema.parse(req.body);
    const operation = async () => ({ status: 201, body: await generator.generate(req.actor!, body) });
    if (pool) return runIdempotent(req, res, pool, operation);
    const result = await operation();
    return res.status(result.status).json(result.body);
  });

  router.get('/:id', async (req, res) => {
    const review = await repository.review(req.actor!, uuid.parse(req.params.id));
    if (!review) { res.status(404).json({ error: { code: 'not_found', message: 'Tanlov topilmadi.' } }); return; }
    res.json(review);
  });

  router.patch('/:id', async (req, res) => {
    const body = renameSchema.parse(req.body);
    const selection = await repository.rename(req.actor!, uuid.parse(req.params.id), body.name);
    if (!selection) { res.status(404).json({ error: { code: 'not_found', message: 'Savatcha topilmadi.' } }); return; }
    res.json(selection);
  });

  router.delete('/:id', async (req, res) => {
    const removed = await repository.remove(req.actor!, uuid.parse(req.params.id));
    if (!removed) { res.status(404).json({ error: { code: 'not_found', message: 'Savatcha topilmadi.' } }); return; }
    res.status(204).send();
  });

  router.post('/:id/assignment', async (req, res) => {
    if (!assignments) {
      res.status(503).json({ error: { code: 'assignment_handoff_unavailable', message: 'Assignment handoff sozlanmagan.' } });
      return;
    }
    const selectionId = uuid.parse(req.params.id);
    const body = assignmentSchema.parse(req.body);
    const operation = async () => ({ status: 201, body: await assignments.create(req.actor!, selectionId, body) });
    if (pool) return runIdempotent(req, res, pool, operation);
    const result = await operation();
    return res.status(result.status).json(result.body);
  });

  router.post('/:id/items', async (req, res) => {
    const selectionId = uuid.parse(req.params.id);
    const body = itemSchema.parse(req.body);
    const result = await repository.addItem(req.actor!, selectionId, body.questionId, body.role);
    if (!result) { res.status(404).json({ error: { code: 'not_found', message: 'Tanlov yoki savol topilmadi.' } }); return; }
    res.status(201).json(result);
  });

  router.patch('/:id/items/:itemId', async (req, res) => {
    const body = updateItemSchema.parse(req.body);
    const result = await repository.updateItem(
      req.actor!,
      uuid.parse(req.params.id),
      uuid.parse(req.params.itemId),
      body.role,
    );
    if (!result) { res.status(404).json({ error: { code: 'not_found', message: 'Tanlov elementi topilmadi.' } }); return; }
    res.json(result);
  });

  router.put('/:id/items/order', async (req, res) => {
    const body = reorderSchema.parse(req.body);
    const reordered = await repository.reorderItems(req.actor!, uuid.parse(req.params.id), body.itemIds);
    if (!reordered) { res.status(404).json({ error: { code: 'not_found', message: 'Savatcha yoki elementlar topilmadi.' } }); return; }
    res.json({ ok: true });
  });

  router.delete('/:id/items/:itemId', async (req, res) => {
    const removed = await repository.removeItem(
      req.actor!,
      uuid.parse(req.params.id),
      uuid.parse(req.params.itemId),
    );
    if (!removed) { res.status(404).json({ error: { code: 'not_found', message: 'Tanlov elementi topilmadi.' } }); return; }
    res.json({ ok: true });
  });

  return router;
}
