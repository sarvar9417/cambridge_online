import { Controller, Get, Inject } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import type { Database } from '@campath/db';
import { schema } from '@campath/db';
import { DATABASE } from '../database.module.js';
import { Roles } from '../common/roles.decorator.js';

/**
 * Owner-only operational reads. Cost and audit data describe the whole school,
 * so there is no per-row scoping to apply — the role is the boundary, which is
 * exactly the case R2 reserves a 403 for.
 */
@Controller('admin')
@Roles('owner')
export class AdminController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get('ai-calls')
  async aiCalls() {
    const rows = await this.db
      .select()
      .from(schema.aiCalls)
      .orderBy(desc(schema.aiCalls.createdAt))
      .limit(100);
    return { data: rows };
  }

  @Get('audit-log')
  async auditLog() {
    const rows = await this.db
      .select()
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(100);
    return { data: rows };
  }
}
