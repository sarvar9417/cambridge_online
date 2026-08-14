import { createApp } from './bootstrap.js';
import { ApiConfig } from './config.js';

const app = await createApp();
const config = app.get(ApiConfig);

await app.listen(config.port, '0.0.0.0');
console.log(`API listening on http://0.0.0.0:${config.port}/api/v1`);
