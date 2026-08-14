import type { Pool } from 'pg';
import type { Actor } from '../lib/actor.js';
import { DomainError } from './assignments-service.js';
export class AdminService {
  constructor(private pool: Pool) {}
  private owner(a: Actor) {
    if (a.role !== 'owner') throw new DomainError('owner_only', 403);
  }
  async settings(a: Actor) {
    this.owner(a);
    return (await this.pool.query(`select key,value,updated_at from app_settings order by key`))
      .rows;
  }
  async aiCalls(a: Actor) {
    this.owner(a);
    return (
      await this.pool.query(
        `select id,purpose,model,input_tokens,output_tokens,cost_usd,latency_ms,ok,created_at from ai_calls order by created_at desc limit 100`,
      )
    ).rows;
  }
  async audit(a: Actor) {
    this.owner(a);
    return (
      await this.pool.query(
        `select id,actor_id,action,ref_table,ref_id,created_at from audit_log order by created_at desc limit 100`,
      )
    ).rows;
  }
}
