import { Router, type Response } from 'express';
import { z } from 'zod';
import type { LiveExamBoardService } from '../services/live-exam-board-service.js';

const uuid = z.string().uuid();

function privateNoStore(res: Response) {
  res.set('Cache-Control', 'private, no-store');
}

export function createLiveExamBoardRouter(service: LiveExamBoardService) {
  const router = Router();

  router.get('/:id/board', async (req, res) => {
    privateNoStore(res);
    res.json({ data: await service.board(req.actor!, uuid.parse(req.params.id)) });
  });

  return router;
}
