import { Router } from 'express';
import type { ClassesRepository } from '../repositories/classes-repository.js';

export function createClassesRouter(repository: ClassesRepository) {
  const router = Router();

  router.get('/', async (req, res) => {
    const classes = await repository.findVisible(req.actor!);
    res.json({ data: classes });
  });

  return router;
}
