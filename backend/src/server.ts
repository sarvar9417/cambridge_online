import { app } from './app.js';
import { config } from './config.js';
import { pool } from './database/client.js';
import { startAttemptScheduler } from './jobs/attempt-scheduler.js';

const server = app.listen(config.PORT, () => {
  if (pool) startAttemptScheduler(pool);
  console.log(`Backend http://localhost:${config.PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Backend ishga tushmadi: ${config.PORT}-port band. Avvalgi npm run dev jarayonini to'xtating va qayta ishga tushiring.`);
  } else {
    console.error('Backend ishga tushmadi:', error);
  }
  process.exitCode = 1;
});
