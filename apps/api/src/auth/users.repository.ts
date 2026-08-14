import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '@campath/db';
import { schema } from '@campath/db';
import type { UserRole } from '@campath/shared';
import { DATABASE } from '../database.module.js';
import { hashRefreshToken } from './token.service.js';

export interface AuthUser {
  id: string;
  schoolId: string | null;
  role: UserRole;
  fullName: string;
  passwordHash: string;
  tokenVersion: number;
  isActive: boolean;
}

export interface RefreshRecord {
  id: string;
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  user: AuthUser;
}

const toAuthUser = (row: typeof schema.users.$inferSelect): AuthUser => ({
  id: row.id,
  schoolId: row.schoolId,
  role: row.role,
  fullName: row.fullName,
  passwordHash: row.passwordHash,
  tokenVersion: row.tokenVersion,
  isActive: row.isActive,
});

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Login accepts either an email or a username, matched case-insensitively. */
  async findByIdentifier(identifier: string): Promise<AuthUser | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.isActive, true),
          sql`(lower(${schema.users.email}) = lower(${identifier})
               or lower(${schema.users.username}) = lower(${identifier}))`,
        ),
      )
      .limit(1);
    return rows[0] ? toAuthUser(rows[0]) : null;
  }

  async findActiveById(id: string): Promise<AuthUser | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.isActive, true)))
      .limit(1);
    return rows[0] ? toAuthUser(rows[0]) : null;
  }

  /**
   * Deliberately narrow: `role`, `schoolId` and `tokenVersion` are not
   * assignable here, so no request body can reach them.
   */
  async updateProfile(
    userId: string,
    patch: { fullName?: string; locale?: 'uz' | 'en' },
  ): Promise<AuthUser> {
    const rows = await this.db
      .update(schema.users)
      .set({
        ...(patch.fullName === undefined ? {} : { fullName: patch.fullName }),
        ...(patch.locale === undefined ? {} : { locale: patch.locale }),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();
    if (!rows[0]) throw new Error('user_not_found');
    return toAuthUser(rows[0]);
  }

  async touchLastLogin(userId: string) {
    await this.db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async storeRefreshToken(input: {
    userId: string;
    rawToken: string;
    expiresAt: Date;
    deviceLabel?: string;
  }) {
    await this.db.insert(schema.refreshTokens).values({
      userId: input.userId,
      tokenHash: hashRefreshToken(input.rawToken),
      expiresAt: input.expiresAt,
      deviceLabel: input.deviceLabel ?? null,
    });
  }

  async findRefreshToken(rawToken: string): Promise<RefreshRecord | null> {
    const rows = await this.db
      .select({ token: schema.refreshTokens, user: schema.users })
      .from(schema.refreshTokens)
      .innerJoin(schema.users, eq(schema.users.id, schema.refreshTokens.userId))
      .where(eq(schema.refreshTokens.tokenHash, hashRefreshToken(rawToken)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      id: row.token.id,
      userId: row.token.userId,
      revokedAt: row.token.revokedAt,
      expiresAt: row.token.expiresAt,
      user: toAuthUser(row.user),
    };
  }

  /**
   * Marks the presented token spent and issues its replacement in one
   * transaction. The conditional UPDATE is the concurrency guard: two parallel
   * refreshes with the same token produce one winner, and the loser's zero row
   * count surfaces as reuse.
   */
  async rotateRefreshToken(input: {
    recordId: string;
    userId: string;
    rawToken: string;
    expiresAt: Date;
  }): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const revoked = await tx
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(eq(schema.refreshTokens.id, input.recordId), isNull(schema.refreshTokens.revokedAt)),
        )
        .returning({ id: schema.refreshTokens.id });

      if (!revoked.length) return false;

      await tx.insert(schema.refreshTokens).values({
        userId: input.userId,
        tokenHash: hashRefreshToken(input.rawToken),
        expiresAt: input.expiresAt,
      });
      return true;
    });
  }

  async revokeRefreshToken(rawToken: string) {
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.refreshTokens.tokenHash, hashRefreshToken(rawToken)),
          isNull(schema.refreshTokens.revokedAt),
        ),
      );
  }

  /**
   * The response to a replayed refresh token: revoke every session and bump
   * `token_version` so live access tokens die too.
   */
  async revokeAllSessions(userId: string) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(eq(schema.refreshTokens.userId, userId), isNull(schema.refreshTokens.revokedAt)),
        );
      await tx
        .update(schema.users)
        .set({ tokenVersion: sql`${schema.users.tokenVersion} + 1`, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    });
  }
}
