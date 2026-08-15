import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';

export interface SystemSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface SystemSummary {
  settings: SystemSetting[];
  budget: { monthlyUsd: number | null; spentUsd: number; remainingUsd: number | null; percentUsed: number | null };
  spendByPurpose: Array<{ purpose: string; calls: number; usd: number; failed: number; unpriced: number }>;
  recentFailures: Array<{ purpose: string; model: string; error: string; createdAt: string }>;
  audit: Array<{ id: string; action: string; refTable: string | null; createdAt: string; actor: string | null }>;
}

/**
 * Settings the owner is allowed to change, and what each one does.
 *
 * The set is closed on purpose. app_settings is a free-form key/value table, so
 * without this an owner could invent a key that nothing reads, or overwrite one
 * a job depends on with a value of the wrong shape.
 */
const EDITABLE: Record<string, { kind: 'number' | 'boolean' | 'string'; min?: number; max?: number }> = {
  // Gates AI grading outright: grade-answer throws ai_budget_exceeded once the
  // month's spend reaches it, so an owner who cannot raise it cannot unblock
  // their own platform.
  'ai.monthly_budget_usd': { kind: 'number', min: 0, max: 10_000 },
  'grading.autopilot_enabled': { kind: 'boolean' },
  'grading.confidence_threshold': { kind: 'number', min: 0, max: 1 },
  'grading.model': { kind: 'string' },
};

export const EDITABLE_SETTING_KEYS = Object.keys(EDITABLE);

export class SystemService {
  constructor(private readonly pool: Pool) {}

  private owner(actor: Actor) {
    if (actor.role !== 'owner') throw new DomainError('owners_only', 403);
  }

  async summary(actor: Actor): Promise<SystemSummary> {
    this.owner(actor);

    const [settings, spend, failures, audit] = await Promise.all([
      this.pool.query(`select key, value, updated_at from app_settings order by key`),

      this.pool.query(`
        select purpose,
               count(*)::int calls,
               coalesce(round(sum(cost_usd)::numeric, 4), 0) usd,
               count(*) filter (where not ok)::int failed,
               count(*) filter (where cost_usd is null)::int unpriced
        from ai_calls
        where created_at >= date_trunc('month', now())
        group by purpose
        order by sum(coalesce(cost_usd, 0)) desc`),

      // The last few failures, because "12 calls failed" is a number and
      // "credit balance is too low" is an instruction.
      this.pool.query(`
        select purpose, model, coalesce(error, '') error, created_at
        from ai_calls where not ok order by created_at desc limit 10`),

      this.pool.query(`
        select a.id, a.action, a.ref_table, a.created_at, u.full_name actor
        from audit_log a
        left join users u on u.id = a.actor_id
        order by a.created_at desc limit 50`),
    ]);

    const budgetRow = settings.rows.find((row) => row.key === 'ai.monthly_budget_usd');
    const monthlyUsd = budgetRow ? Number(budgetRow.value) : null;
    const spentUsd = spend.rows.reduce((sum, row) => sum + Number(row.usd), 0);

    return {
      settings: settings.rows.map((row) => ({
        key: String(row.key),
        value: row.value,
        updatedAt: String(row.updated_at),
      })),
      budget: {
        monthlyUsd: Number.isFinite(monthlyUsd) ? monthlyUsd : null,
        spentUsd,
        remainingUsd: monthlyUsd === null || !Number.isFinite(monthlyUsd) ? null : monthlyUsd - spentUsd,
        percentUsed: monthlyUsd ? Math.round((spentUsd / monthlyUsd) * 100) : null,
      },
      spendByPurpose: spend.rows.map((row) => ({
        purpose: String(row.purpose),
        calls: Number(row.calls),
        usd: Number(row.usd),
        failed: Number(row.failed),
        unpriced: Number(row.unpriced),
      })),
      recentFailures: failures.rows.map((row) => ({
        purpose: String(row.purpose),
        model: String(row.model),
        error: String(row.error).slice(0, 240),
        createdAt: String(row.created_at),
      })),
      audit: audit.rows.map((row) => ({
        id: String(row.id),
        action: String(row.action),
        refTable: row.ref_table ? String(row.ref_table) : null,
        createdAt: String(row.created_at),
        actor: row.actor ? String(row.actor) : null,
      })),
    };
  }

  /**
   * Writes one setting, and records who changed it.
   *
   * Values are stored as jsonb, so a number has to arrive as a number and not
   * as the string "50" -- a job reading `(value::text)::numeric` would still
   * work, but one reading it as a boolean would not.
   */
  async updateSetting(actor: Actor, key: string, rawValue: unknown) {
    this.owner(actor);
    const spec = EDITABLE[key];
    if (!spec) throw new DomainError('setting_not_editable', 400);

    let value: unknown;
    if (spec.kind === 'number') {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed)) throw new DomainError('setting_invalid_value', 400);
      if (spec.min !== undefined && parsed < spec.min) throw new DomainError('setting_out_of_range', 400);
      if (spec.max !== undefined && parsed > spec.max) throw new DomainError('setting_out_of_range', 400);
      value = parsed;
    } else if (spec.kind === 'boolean') {
      if (typeof rawValue !== 'boolean') throw new DomainError('setting_invalid_value', 400);
      value = rawValue;
    } else {
      if (typeof rawValue !== 'string' || !rawValue.trim()) throw new DomainError('setting_invalid_value', 400);
      value = rawValue.trim();
    }

    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const before = await client.query('select value from app_settings where key = $1', [key]);
      const updated = await client.query(
        `insert into app_settings (key, value, updated_by, updated_at)
         values ($1, $2::jsonb, $3, now())
         on conflict (key) do update
           set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()
         returning key, value, updated_at`,
        [key, JSON.stringify(value), actor.id],
      );
      // Changing the AI budget or the grading model changes what the platform
      // does to real student work, so it belongs in the audit trail.
      await client.query(
        `insert into audit_log (actor_id, action, ref_table, ref_id, before, after)
         values ($1, 'admin.setting_update', 'app_settings', null, $2, $3)`,
        [actor.id, JSON.stringify({ key, value: before.rows[0]?.value ?? null }), JSON.stringify({ key, value })],
      );
      await client.query('commit');
      return {
        key: String(updated.rows[0].key),
        value: updated.rows[0].value,
        updatedAt: String(updated.rows[0].updated_at),
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
