import { randomUUID } from 'node:crypto';
import type {
  AuthRepository, AuthUser, PendingUser, RefreshRecord, UserStatus,
} from './auth-repository.js';

/**
 * In-memory AuthRepository for tests.
 *
 * There is no PostgreSQL in the test run, so this stands in for it. It exists as
 * one shared double rather than one per test file so that adding a method to the
 * interface breaks in a single place, and so the approval and reset tests
 * exercise the same object the login tests do.
 *
 * It enforces the constraints the real schema enforces -- unique email, unique
 * username, single-use reset tokens, approve only from pending -- because those
 * are the rules the service is written against. A double that accepts anything
 * proves nothing.
 */
export interface MemoryUser extends AuthUser {
  email: string | null;
  username: string | null;
  note: string | null;
  createdAt: Date;
}

interface ResetToken {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  issuedBy: string | null;
}

const toPending = (user: MemoryUser): PendingUser => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  username: user.username,
  status: user.status,
  statusReason: user.statusReason,
  emailVerified: user.emailVerifiedAt !== null,
  createdAt: user.createdAt,
});

export class MemoryAuthRepository implements AuthRepository {
  users = new Map<string, MemoryUser>();
  refreshRecords = new Map<string, RefreshRecord>();
  resetTokens: ResetToken[] = [];
  enrollments: Array<{ classId: string; userId: string; groupId: string | null; as: 'student' | 'teacher' }> = [];
  classes = new Map<string, { schoolId: string }>();
  groups = new Map<string, { classId: string; name: string }>();
  revokedAll = 0;

  /** The account the login tests act as. Kept for readability at call sites. */
  get user() {
    return [...this.users.values()][0]!;
  }
  set user(value: MemoryUser) {
    this.users.set(value.id, value);
  }

  add(user: Partial<MemoryUser> & Pick<MemoryUser, 'id' | 'passwordHash'>) {
    const full: MemoryUser = {
      schoolId: null, role: 'student', fullName: 'Test User', tokenVersion: 1, isActive: true,
      status: 'active', statusReason: null, email: null, username: null, note: null,
      // Existing accounts got in through an invite, so their address was already
      // accepted by a person; only a self-registration starts unverified.
      emailVerifiedAt: new Date(), createdAt: new Date(), ...user,
    };
    this.users.set(full.id, full);
    return full;
  }

  private byIdentifier(identifier: string) {
    const needle = identifier.toLowerCase();
    return [...this.users.values()].find(
      (user) => user.email?.toLowerCase() === needle || user.username?.toLowerCase() === needle,
    );
  }

  async findByIdentifier(identifier: string) {
    const user = this.byIdentifier(identifier);
    return user?.isActive ? user : null;
  }

  async findById(id: string) {
    const user = this.users.get(id);
    return user && user.isActive && user.status === 'active' ? user : null;
  }

  async storeRefreshToken(userId: string, rawToken: string, expiresAt: Date) {
    const user = this.users.get(userId)!;
    this.refreshRecords.set(rawToken, {
      id: randomUUID(), userId, tokenVersion: user.tokenVersion, revokedAt: null, expiresAt, user,
    });
  }

  async findRefreshToken(rawToken: string) {
    return this.refreshRecords.get(rawToken) ?? null;
  }

  async rotateRefreshToken(recordId: string, userId: string, rawToken: string, expiresAt: Date) {
    const previous = [...this.refreshRecords.values()].find((record) => record.id === recordId);
    if (!previous || previous.revokedAt) throw new Error('refresh_already_used');
    previous.revokedAt = new Date();
    await this.storeRefreshToken(userId, rawToken, expiresAt);
  }

  async revokeRefreshToken(rawToken: string) {
    this.refreshRecords.delete(rawToken);
  }

  async revokeAllSessions(userId?: string) {
    this.revokedAll += 1;
    for (const record of this.refreshRecords.values()) record.revokedAt ??= new Date();
    const user = userId ? this.users.get(userId) : this.user;
    if (user) user.tokenVersion += 1;
  }

  async updateLastLogin() {}

  async redeemInvite(input: { code: string; fullName: string; username: string; passwordHash: string }) {
    if (input.code !== 'VALID-CODE') throw new Error('invite_invalid');
    return this.add({
      id: randomUUID(), role: 'student', fullName: input.fullName,
      username: input.username, passwordHash: input.passwordHash, status: 'active',
    });
  }

  async changePassword(userId: string, passwordHash: string) {
    const user = this.users.get(userId) ?? this.user;
    user.passwordHash = passwordHash;
    await this.revokeAllSessions(user.id);
  }

  async updateProfile(userId: string, input: { fullName?: string }) {
    const user = this.users.get(userId) ?? this.user;
    if (input.fullName) user.fullName = input.fullName;
    return user;
  }

  async register(input: { fullName: string; email: string; username: string; passwordHash: string; note?: string }) {
    const clash = [...this.users.values()].find(
      (user) => user.email?.toLowerCase() === input.email.toLowerCase()
        || user.username?.toLowerCase() === input.username.toLowerCase(),
    );
    if (clash) {
      // Shaped like the driver's unique-violation so the service's branch on
      // `constraint` is exercised rather than bypassed.
      const taken = clash.email?.toLowerCase() === input.email.toLowerCase();
      throw Object.assign(new Error('duplicate key'), {
        code: '23505', constraint: taken ? 'users_email_lower_key' : 'users_username_lower_key',
      });
    }
    return toPending(this.add({
      id: randomUUID(), role: 'student', status: 'pending', fullName: input.fullName,
      email: input.email, username: input.username, passwordHash: input.passwordHash,
      note: input.note ?? null, emailVerifiedAt: null,
    }));
  }

  async findByEmail(email: string) {
    const user = [...this.users.values()].find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase() && candidate.isActive,
    );
    return user ? { id: user.id, fullName: user.fullName, status: user.status } : null;
  }

  async createResetToken(input: { userId: string; tokenHash: string; expiresAt: Date; issuedBy?: string }) {
    for (const token of this.resetTokens) {
      if (token.userId === input.userId && !token.usedAt) token.usedAt = new Date();
    }
    this.resetTokens.push({
      tokenHash: input.tokenHash, userId: input.userId, expiresAt: input.expiresAt,
      usedAt: null, issuedBy: input.issuedBy ?? null,
    });
  }

  async consumeResetToken(tokenHash: string, passwordHash: string) {
    const token = this.resetTokens.find(
      (candidate) => candidate.tokenHash === tokenHash && !candidate.usedAt && candidate.expiresAt > new Date(),
    );
    if (!token) return null;
    token.usedAt = new Date();
    const user = this.users.get(token.userId)!;
    user.passwordHash = passwordHash;
    user.tokenVersion += 1;
    for (const record of this.refreshRecords.values()) {
      if (record.userId === token.userId) record.revokedAt ??= new Date();
    }
    return { userId: token.userId };
  }

  async listUsers(filter: { status?: UserStatus }) {
    return [...this.users.values()]
      .filter((user) => user.isActive && (!filter.status || user.status === filter.status))
      .sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1))
      .map((user) => ({ ...toPending(user), note: user.note }));
  }

  async listGroups(classId: string) {
    return [...this.groups.entries()]
      .filter(([, group]) => group.classId === classId)
      .map(([id, group]) => ({ id, name: group.name }));
  }

  verificationTokens: Array<{ tokenHash: string; userId: string; expiresAt: Date; usedAt: Date | null }> = [];
  dependents = new Map<string, Array<{ what: string; count: number }>>();
  deleted: string[] = [];

  async createVerificationToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    for (const token of this.verificationTokens) {
      if (token.userId === input.userId && !token.usedAt) token.usedAt = new Date();
    }
    this.verificationTokens.push({ ...input, usedAt: null });
  }

  async consumeVerificationToken(tokenHash: string) {
    const token = this.verificationTokens.find(
      (candidate) => candidate.tokenHash === tokenHash && !candidate.usedAt && candidate.expiresAt > new Date(),
    );
    if (!token) return null;
    token.usedAt = new Date();
    const user = this.users.get(token.userId);
    if (user) user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
    return { userId: token.userId };
  }

  async markEmailVerified(userId: string) {
    const user = this.users.get(userId);
    if (!user || !user.isActive) throw new Error('user_not_found');
    user.emailVerifiedAt = user.emailVerifiedAt ?? new Date();
  }

  async countDependents(userId: string) {
    return this.dependents.get(userId) ?? [];
  }

  async deleteUser(userId: string) {
    if (!this.users.delete(userId)) throw new Error('user_not_found');
    this.deleted.push(userId);
  }

  async reinstateUser(userId: string) {
    const user = this.users.get(userId);
    if (!user || user.status !== 'rejected') throw new Error('user_not_rejected');
    user.status = 'pending';
    user.statusReason = null;
    return toPending(user);
  }

  async approveUser(input: {
    userId: string; role: AuthUser['role']; classId?: string; groupId?: string; approvedBy: string;
  }) {
    const user = this.users.get(input.userId);
    if (!user || user.status !== 'pending') throw new Error('user_not_pending');
    if (input.classId) {
      const klass = this.classes.get(input.classId);
      if (!klass) throw new Error('class_not_found');
      const isStudent = input.role === 'student';
      if (isStudent && input.groupId) {
        // Mirrors the composite foreign key: a group only counts inside its own
        // class.
        const group = this.groups.get(input.groupId);
        if (!group || group.classId !== input.classId) throw new Error('group_not_in_class');
      }
      user.schoolId = klass.schoolId;
      this.enrollments.push({
        classId: input.classId, userId: user.id,
        groupId: isStudent ? input.groupId ?? null : null,
        as: isStudent ? 'student' : 'teacher',
      });
    }
    user.status = 'active';
    user.role = input.role;
    user.statusReason = null;
    return toPending(user);
  }

  async rejectUser(input: { userId: string; reason: string; approvedBy: string }) {
    const user = this.users.get(input.userId);
    if (!user || user.status !== 'pending') throw new Error('user_not_pending');
    user.status = 'rejected';
    user.statusReason = input.reason;
    return toPending(user);
  }

  async setUserStatus(input: { userId: string; status: 'active' | 'suspended'; reason?: string }) {
    const user = this.users.get(input.userId);
    if (!user || !['active', 'suspended'].includes(user.status)) throw new Error('user_not_found');
    user.status = input.status;
    user.statusReason = input.reason ?? null;
    if (input.status === 'suspended') {
      user.tokenVersion += 1;
      for (const record of this.refreshRecords.values()) {
        if (record.userId === user.id) record.revokedAt ??= new Date();
      }
    }
    return toPending(user);
  }

  async setUserRole(input: { userId: string; role: AuthUser['role'] }) {
    const user = this.users.get(input.userId);
    if (!user || !user.isActive) throw new Error('user_not_found');
    user.role = input.role;
    user.tokenVersion += 1;
    return toPending(user);
  }
}
