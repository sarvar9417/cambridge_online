import { app } from './app.js';
import { config } from './config.js';
import { pool } from './database/client.js';
import { startAttemptScheduler } from './jobs/attempt-scheduler.js';

app.listen(config.PORT, (error?: NodeJS.ErrnoException) => {
  if (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`Backend ishga tushmadi: ${config.PORT}-port band. Avvalgi npm run dev jarayonini to'xtating va qayta ishga tushiring.`);
    } else {
      console.error('Backend ishga tushmadi:', error);
    }
    process.exitCode = 1;
    return;
  }
  if (pool) startAttemptScheduler(pool);
  console.log(`Backend http://localhost:${config.PORT}`);
});
