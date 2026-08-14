import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: resolve(backendRoot, '../.env'), quiet: true });

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1).optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32).default('local-development-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(32).default('local-refresh-secret-change-me-now'),
  CHROME_EXECUTABLE_PATH: z.string().optional(),
  CHROMIUM_PACK_URL: z.string().url().optional(),
  PDFTOPPM_PATH: z.string().optional(),
  PDFTOTEXT_PATH: z.string().optional(),
  EXPORT_DIR: z.string().default('storage/exports'),
});

const parsed = configSchema.parse(process.env);
export const config = {
  ...parsed,
  DB_POOL_MAX: parsed.DB_POOL_MAX ?? (process.env.VERCEL ? 2 : 10),
};
