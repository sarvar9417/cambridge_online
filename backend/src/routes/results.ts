import { Router } from 'express';
import { z } from 'zod';
import { ResultsService } from '../services/results-service.js';

export function createResultsRouter(service: ResultsService) {
  const router = Router();
  router.get('/', async (req, res) => res.json({ data: await service.list(req.actor!) }));
  router.get('/:id', async (req, res) => res.json({ data: await service.detail(req.actor!, z.string().uuid().parse(req.params.id)) }));
  return router;
}
