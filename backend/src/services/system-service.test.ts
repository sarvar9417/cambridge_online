import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { EDITABLE_SETTING_KEYS, SystemService } from './system-service.js';
import type { Actor } from '../lib/actor.js';

const owner: Actor = { id: 'o1', role: 'owner', schoolId: 's1', fullName: 'Sarvar' };
const teacher: Actor = { ...owner, role: 'teacher' };

const SETTINGS = [
  { key: 'ai.monthly_budget_usd', value: 50, updated_at: '2026-08-13T16:23:43Z' },
  { key: 'grading.autopilot_enabled', value: false, updated_at: '2026-08-13T16:23:43Z' },
];

function readPool(spend: Array<Record<string, unknown>> = []) {
  let call = 0;
  const rows = [SETTINGS, spend, [], []];
  const query = vi.fn(async () => ({ rows: rows[call++] ?? [], rowCount: 0 }));
  return { query } as unknown as Pool;
}

/** Captures every statement so a test can assert what was written. */
function writePool(existing: unknown = 50) {
  const statements: string[] = [];
  const params: unknown[][] = [];
  const client = {
    query: vi.fn(async (sql: string, values?: unknown[]) => {
      statements.push(sql);
      if (values) params.push(values);
      if (sql.startsWith('select value')) return { rows: [{ value: existing }], rowCount: 1 };
      if (sql.includes('insert into app_settings')) {
        return { rows: [{ key: values![0], value: JSON.parse(String(values![1])), updated_at: 'now' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  } as unknown as PoolClient;
  return { pool: { connect: async () => client } as unknown as Pool, client, statements, params };
}

describe('system summary', () => {
  it('is owner only', async () => {
    await expect(new SystemService(readPool()).summary(teacher)).rejects.toMatchObject({ status: 403 });
  });

  it('computes what is left of the month’s budget', async () => {
    const result = await new SystemService(readPool([
      { purpose: 'extract_qp', calls: 31, usd: '0.5762', failed: 1, unpriced: 19 },
      { purpose: 'extract_ms', calls: 5, usd: '0.4085', failed: 0, unpriced: 0 },
    ])).summary(owner);

    expect(result.budget.monthlyUsd).toBe(50);
    expect(result.budget.spentUsd).toBeCloseTo(0.9847, 4);
    expect(result.budget.remainingUsd).toBeCloseTo(49.0153, 4);
    expect(result.budget.percentUsed).toBe(2);
  });

  it('reports no budget rather than pretending there is one', async () => {
    let call = 0;
    const rows = [[{ key: 'grading.model', value: 'x', updated_at: 'now' }], [], [], []];
    const pool = { query: vi.fn(async () => ({ rows: rows[call++] ?? [], rowCount: 0 })) } as unknown as Pool;
    const result = await new SystemService(pool).summary(owner);
    expect(result.budget.monthlyUsd).toBeNull();
    expect(result.budget.remainingUsd).toBeNull();
    expect(result.budget.percentUsed).toBeNull();
  });
});

describe('updating a setting', () => {
  it('is owner only', async () => {
    await expect(new SystemService(writePool().pool).updateSetting(teacher, 'ai.monthly_budget_usd', 100))
      .rejects.toMatchObject({ status: 403 });
  });

  it('refuses a key nothing reads', async () => {
    // app_settings is free-form, so without a closed list an owner could invent
    // a key that no job ever looks at and believe they had changed something.
    await expect(new SystemService(writePool().pool).updateSetting(owner, 'made.up.key', 1))
      .rejects.toMatchObject({ code: 'setting_not_editable', status: 400 });
  });

  it('stores a number as a number, not as a quoted string', async () => {
    const { pool, params } = writePool();
    await new SystemService(pool).updateSetting(owner, 'ai.monthly_budget_usd', '250');
    const insert = params.find((values) => typeof values[1] === 'string' && values[1] !== 'ai.monthly_budget_usd');
    expect(insert![1]).toBe('250');
  });

  it('keeps a boolean a boolean', async () => {
    const { pool, params } = writePool(false);
    await new SystemService(pool).updateSetting(owner, 'grading.autopilot_enabled', true);
    expect(params.some((values) => values[1] === 'true')).toBe(true);
  });

  it('rejects a value of the wrong type for the key', async () => {
    const service = new SystemService(writePool().pool);
    await expect(service.updateSetting(owner, 'grading.autopilot_enabled', 'yes'))
      .rejects.toMatchObject({ code: 'setting_invalid_value' });
    await expect(service.updateSetting(owner, 'ai.monthly_budget_usd', 'not a number'))
      .rejects.toMatchObject({ code: 'setting_invalid_value' });
  });

  it('holds numbers inside their range', async () => {
    const service = new SystemService(writePool().pool);
    await expect(service.updateSetting(owner, 'ai.monthly_budget_usd', -1))
      .rejects.toMatchObject({ code: 'setting_out_of_range' });
    // A confidence threshold above 1 would send every answer to a teacher and
    // look like the AI had stopped working.
    await expect(service.updateSetting(owner, 'grading.confidence_threshold', 1.5))
      .rejects.toMatchObject({ code: 'setting_out_of_range' });
  });

  it('records who changed what, in the same transaction', async () => {
    const { pool, statements } = writePool();
    await new SystemService(pool).updateSetting(owner, 'ai.monthly_budget_usd', 250);
    expect(statements[0]).toBe('begin');
    expect(statements.some((sql) => sql.includes('insert into audit_log'))).toBe(true);
    expect(statements.at(-1)).toBe('commit');
  });

  it('rolls back rather than leaving the setting changed without a trail', async () => {
    const { pool, client, statements } = writePool();
    (client.query as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => ({ rows: [], rowCount: 0 }))
      .mockImplementationOnce(async () => ({ rows: [{ value: 50 }], rowCount: 1 }))
      .mockImplementationOnce(async () => { throw new Error('disk full'); });
    await expect(new SystemService(pool).updateSetting(owner, 'ai.monthly_budget_usd', 250)).rejects.toThrow('disk full');
    expect(statements).toContain('rollback');
  });

  it('exports the editable keys so the UI and the guard cannot drift', () => {
    expect(EDITABLE_SETTING_KEYS).toContain('ai.monthly_budget_usd');
    expect(EDITABLE_SETTING_KEYS).toContain('grading.autopilot_enabled');
  });
});
