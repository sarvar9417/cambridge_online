import { Router } from 'express';
import { z } from 'zod';
import { AnalyticsService } from '../services/analytics-service.js';

const uuid = z.string().uuid();

export function createAnalyticsRouter(service: AnalyticsService) {
  const router = Router();
  router.get('/overview', async (req, res) => res.json({ data: await service.overview(req.actor!) }));
  router.get('/mastery', async (req, res) => res.json({ data: await service.mastery(req.actor!) }));
  router.get('/command-words', async (req, res) => res.json({ data: await service.studentCommandWords(req.actor!) }));
  router.get('/students/:id/mastery', async (req, res) => res.json({ data: await service.mastery(req.actor!, uuid.parse(req.params.id)) }));
  router.get('/classes/:id/heatmap', async (req, res) => res.json({ data: await service.heatmap(req.actor!, uuid.parse(req.params.id)) }));
  router.get('/classes/:id/mark-points', async (req, res) => res.json({ data: await service.markPoints(req.actor!, uuid.parse(req.params.id)) }));
  router.get('/classes/:id/command-words', async (req, res) => res.json({ data: await service.commandWords(req.actor!, uuid.parse(req.params.id)) }));
  router.get('/ai-quality', async (req, res) => res.json({ data: await service.aiQuality(req.actor!) }));
  return router;
}
