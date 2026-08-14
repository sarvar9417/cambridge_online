import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, sql } from 'drizzle-orm';
import type { Database } from '@campath/db';
import { schema } from '@campath/db';
import { DATABASE } from '../database.module.js';
import type { AuthUser } from './users.repository.js';

export class InviteInvalidError extends Error {}
export class UsernameTakenError extends Error {}

@Injectable()
export class InvitesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Redeems an invite and creates the account in one transaction.
   *
   * The `used_count < max_uses` predicate lives in the UPDATE rather than in a
   * prior SELECT, so two people redeeming the last seat at the same moment
   * cannot both win — the second gets zero rows and a 410.
   */
  async redeem(input: {
    code: string;
    fullName: string;
    username: string;
    passwordHash: string;
  }): Promise<AuthUser> {
    return this.db.transaction(async (tx) => {
      const claimed = await tx
        .update(schema.invites)
        .set({ usedCount: sql`${schema.invites.usedCount} + 1` })
        .where(
          and(
            eq(schema.invites.code, input.code),
            gt(schema.invites.expiresAt, new Date()),
            sql`${schema.invites.usedCount} < ${schema.invites.maxUses}`,
          ),
        )
        .returning({
          id: schema.invites.id,
          classId: schema.invites.classId,
          role: schema.invites.role,
        });

      const invite = claimed[0];
      if (!invite) throw new InviteInvalidError('invite_invalid');

      const [klass] = await tx
        .select({ schoolId: schema.classes.schoolId })
        .from(schema.classes)
        .where(eq(schema.classes.id, invite.classId))
        .limit(1);
      if (!klass) throw new InviteInvalidError('invite_invalid');

      let created;
      try {
        [created] = await tx
          .insert(schema.users)
          .values({
            schoolId: klass.schoolId,
            role: invite.role,
            fullName: input.fullName,
            username: input.username,
            passwordHash: input.passwordHash,
          })
          .returning();
      } catch (error) {
        if (isUniqueViolation(error)) throw new UsernameTakenError('username_taken');
        throw error;
      }
      if (!created) throw new InviteInvalidError('invite_invalid');

      if (invite.role === 'student') {
        await tx
          .insert(schema.enrollments)
          .values({ classId: invite.classId, studentId: created.id });
      } else {
        await tx
          .insert(schema.classTeachers)
          .values({ classId: invite.classId, teacherId: created.id });
      }

      return {
        id: created.id,
        schoolId: created.schoolId,
        role: created.role,
        fullName: created.fullName,
        passwordHash: created.passwordHash,
        tokenVersion: created.tokenVersion,
        isActive: created.isActive,
      };
    });
  }
}

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
