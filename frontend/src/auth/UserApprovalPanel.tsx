import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api, type ClassItem } from '../lib/api';
import './user-approval.css';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';
type Role = 'owner' | 'teacher' | 'student';

/** One row's in-progress approval decision. */
interface Draft { role: Role; classId: string; groupId: string; reason: string }

interface ManagedUser {
  id: string;
  fullName: string;
  email: string | null;
  username: string | null;
  status: Status;
  statusReason: string | null;
  note: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Kutilmoqda',
  active: 'Faol',
  rejected: 'Rad etilgan',
  suspended: 'To‘xtatilgan',
};

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Administrator',
  teacher: 'O‘qituvchi',
  student: 'O‘quvchi',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Deciding who gets in.
 *
 * Pending first, because that is the only list with work in it. Approving asks
 * for a role and a class in the same step rather than leaving a newly active
 * account floating with no class -- that gap is how a student ends up approved
 * and still unable to see anything.
 */
export function UserApprovalPanel({ classes, currentUserId }: {
  classes: ClassItem[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Per-row draft, so two rows open at once do not share a role choice. */
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [issuedCode, setIssuedCode] = useState<{ userId: string; link: string; minutes: number } | null>(null);
  /** Groups by class id. Fetched on demand; a class with none maps to []. */
  const [groups, setGroups] = useState<Record<string, Array<{ id: string; name: string }>>>({});

  const loadGroups = useCallback(async (classId: string) => {
    if (!classId || groups[classId]) return;
    try {
      const result = await api<{ groups: Array<{ id: string; name: string }> }>(
        `/admin/users/groups/${classId}`);
      setGroups((current) => ({ ...current, [classId]: result.groups }));
    } catch {
      // A class whose groups cannot be listed still gets approved without one;
      // failing the whole row over an optional placement would be worse.
      setGroups((current) => ({ ...current, [classId]: [] }));
    }
  }, [groups]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === 'all' ? '' : `?status=${filter}`;
      const result = await api<{ users: ManagedUser[] }>(`/admin/users${query}`);
      setUsers(result.users);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ro‘yxat yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const emptyDraft = (): Draft => ({ role: 'student', classId: '', groupId: '', reason: '' });
  const draftFor = (user: ManagedUser) => draft[user.id] ?? emptyDraft();

  const setDraftFor = (id: string, patch: Partial<Draft>) =>
    setDraft((current) => ({
      ...current,
      [id]: { ...(current[id] ?? emptyDraft()), ...patch },
    }));

  const act = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Amal bajarilmadi.');
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = useMemo(() => users.filter((user) => user.status === 'pending').length, [users]);

  return (
    <section className="ua">
      <header className="ua-header">
        <div>
          <h2>Foydalanuvchilar</h2>
          <p className="ua-sub">
            {filter === 'pending' && pendingCount > 0
              ? `${pendingCount} ta ariza ko‘rib chiqilishini kutmoqda`
              : 'Ro‘yxatdan o‘tganlarni tasdiqlang, rol va sinf bering'}
          </p>
        </div>
        <div className="ua-filters" role="tablist" aria-label="Holat bo‘yicha filtr">
          {(['pending', 'active', 'suspended', 'rejected', 'all'] as const).map((value) => (
            <button
              key={value} role="tab" aria-selected={filter === value}
              className={filter === value ? 'is-active' : ''}
              onClick={() => setFilter(value)}
            >
              {value === 'all' ? 'Hammasi' : STATUS_LABEL[value]}
            </button>
          ))}
        </div>
      </header>

      {error ? <p className="ua-error" role="alert">{error}</p> : null}

      {loading ? <p className="ua-empty">Yuklanmoqda…</p>
        : users.length === 0 ? (
          <p className="ua-empty">
            {filter === 'pending' ? 'Kutilayotgan ariza yo‘q. Hammasi ko‘rib chiqilgan.' : 'Ro‘yxat bo‘sh.'}
          </p>
        ) : (
          <ul className="ua-list">
            {users.map((user) => {
              const current = draftFor(user);
              const busy = busyId === user.id;
              return (
                <li key={user.id} className={`ua-row ua-row--${user.status}`}>
                  <div className="ua-identity">
                    <span className="ua-avatar" aria-hidden="true">
                      {user.fullName.trim().charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong>{user.fullName}</strong>
                      <span className="ua-meta">
                        {user.username ? `@${user.username}` : null}
                        {user.username && user.email ? ' · ' : null}
                        {user.email}
                      </span>
                      <span className="ua-meta">{formatDate(user.createdAt)}</span>
                    </div>
                    <span className={`ua-badge ua-badge--${user.status}`}>{STATUS_LABEL[user.status]}</span>
                  </div>

                  {/* The applicant's own words about where they belong. */}
                  {user.note ? <p className="ua-note">“{user.note}”</p> : null}
                  {user.statusReason ? <p className="ua-reason">{user.statusReason}</p> : null}

                  {user.status === 'pending' ? (
                    <div className="ua-actions">
                      <label className="ua-control">
                        <span>Rol</span>
                        <select
                          value={current.role}
                          onChange={(event) => setDraftFor(user.id, { role: event.target.value as Role })}
                        >
                          {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                            <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="ua-control">
                        <span>Sinf</span>
                        <select
                          value={current.classId}
                          onChange={(event) => {
                            const classId = event.target.value;
                            // Changing the class invalidates the group: a group
                            // only exists inside its own class.
                            setDraftFor(user.id, { classId, groupId: '' });
                            void loadGroups(classId);
                          }}
                        >
                          <option value="">— tanlanmagan —</option>
                          {classes.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </label>
                      {current.classId && (groups[current.classId]?.length ?? 0) > 0 ? (
                        <label className="ua-control">
                          <span>Guruh</span>
                          <select
                            value={current.groupId}
                            onChange={(event) => setDraftFor(user.id, { groupId: event.target.value })}
                          >
                            <option value="">— tanlanmagan —</option>
                            {groups[current.classId]!.map((group) => (
                              <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <button
                        className="ua-approve" disabled={busy}
                        onClick={() => act(user.id, () => api(`/admin/users/${user.id}/approve`, {
                          method: 'POST',
                          body: JSON.stringify({
                            role: current.role,
                            ...(current.classId ? { classId: current.classId } : {}),
                            // Only meaningful for a student, and only with a class.
                            ...(current.classId && current.groupId && current.role === 'student'
                              ? { groupId: current.groupId } : {}),
                          }),
                        }))}
                      >
                        {busy ? '…' : 'Tasdiqlash'}
                      </button>
                      <button
                        className="ua-reject" disabled={busy || !current.reason.trim()}
                        title={current.reason.trim() ? undefined : 'Rad etish sababini yozing'}
                        onClick={() => act(user.id, () => api(`/admin/users/${user.id}/reject`, {
                          method: 'POST', body: JSON.stringify({ reason: current.reason.trim() }),
                        }))}
                      >
                        Rad etish
                      </button>
                      <input
                        className="ua-reason-input" placeholder="Rad etish sababi"
                        value={current.reason} maxLength={300}
                        onChange={(event) => setDraftFor(user.id, { reason: event.target.value })}
                      />
                    </div>
                  ) : user.id === currentUserId ? (
                    <p className="ua-self">Bu sizning hisobingiz.</p>
                  ) : (
                    <div className="ua-actions">
                      <label className="ua-control">
                        <span>Rol</span>
                        <select
                          value={current.role}
                          onChange={(event) => {
                            const role = event.target.value as Role;
                            setDraftFor(user.id, { role });
                            void act(user.id, () => api(`/admin/users/${user.id}/role`, {
                              method: 'POST', body: JSON.stringify({ role }),
                            }));
                          }}
                        >
                          {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                            <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                          ))}
                        </select>
                      </label>
                      {user.status === 'active' ? (
                        <>
                          <button
                            className="ua-secondary" disabled={busy}
                            onClick={() => act(user.id, async () => {
                              const result = await api<{ link: string; expiresInMinutes: number }>(
                                `/admin/users/${user.id}/reset-code`, { method: 'POST', body: JSON.stringify({}) });
                              setIssuedCode({ userId: user.id, link: result.link, minutes: result.expiresInMinutes });
                            })}
                          >
                            Parol tiklash havolasi
                          </button>
                          <button
                            className="ua-reject" disabled={busy}
                            onClick={() => act(user.id, () => api(`/admin/users/${user.id}/status`, {
                              method: 'POST',
                              body: JSON.stringify({ status: 'suspended', reason: current.reason.trim() || undefined }),
                            }))}
                          >
                            To‘xtatish
                          </button>
                        </>
                      ) : user.status === 'suspended' ? (
                        <button
                          className="ua-approve" disabled={busy}
                          onClick={() => act(user.id, () => api(`/admin/users/${user.id}/status`, {
                            method: 'POST', body: JSON.stringify({ status: 'active' }),
                          }))}
                        >
                          Qayta faollashtirish
                        </button>
                      ) : null}
                    </div>
                  )}

                  {issuedCode?.userId === user.id ? (
                    <div className="ua-code" role="status">
                      <p>
                        Bu havolani o‘quvchiga bering. {issuedCode.minutes} daqiqa amal qiladi va
                        bir marta ishlaydi.
                      </p>
                      <code>{issuedCode.link}</code>
                      <button className="ua-secondary" onClick={() => setIssuedCode(null)}>Yopish</button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}
