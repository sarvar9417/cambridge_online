import { app } from './app.js';
import { config } from './config.js';
import { pool } from './database/client.js';
import { startAttemptScheduler } from './jobs/attempt-scheduler.js';

if (pool) startAttemptScheduler(pool);

app.listen(config.PORT, () => {
  console.log(`Backend http://localhost:${config.PORT}`);
});
