import type { IncomingMessage, ServerResponse } from 'node:http';
import { pool } from '../backend/src/database/client.js';
import { PgQuestionsRepository } from '../backend/src/repositories/questions-repository.js';
import { AssignmentsService } from '../backend/src/services/assignments-service.js';
import { LiveExamService } from '../backend/src/services/live-exam-service.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return;
  }
  if (!pool) {
    res.statusCode = 503;
    res.end('Database unavailable');
    return;
  }
  const [closedAssignments, closedLiveExams] = await Promise.all([
    new AssignmentsService(pool).closeExpired(500),
    new LiveExamService(pool, new PgQuestionsRepository(pool)).closeExpired(500),
  ]);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ closedAssignments, closedLiveExams }));
}
