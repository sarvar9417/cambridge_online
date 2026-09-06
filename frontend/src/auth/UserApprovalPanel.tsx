import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api, type ClassItem } from '../lib/api';
import './user-approval.css';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';
type Role = 'owner' | 'teacher' | 'student';

interface Membership {
  classId: string;
  className: string;
  kind: 'student' | 'teacher';
  groupId: string | null;
  groupName: string | null;
}

interface ManagedUser {
  id: string;
  schoolId?: string | null;
  fullName: string;
  email: string | null;
  username: string | null;
  role?: Role;
  status: Status;
  statusReason: string | null;
  emailVerified: boolean;
  note: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  memberships?: Membership[];
}

interface Draft {
  role: Role;
  classId: string;
  groupId: string;
  reason: string;
  fullName: string;
  email: string;
  username: string;
  password: string;
}

interface AuditEvent {
  id: string;
  action: string;
  before: unknown;
  after: unknown;
  actorId: string | null;
  actorName: string;
  createdAt: string;
}

interface CreateDraft {
  fullName: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  classId: string;
  groupId: string;
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

const ACTION_LABEL: Record<string, string> = {
  'admin.user_create': 'User yaratildi',
  'admin.user_approve': 'Tasdiqlandi',
  'admin.user_reject': 'Rad etildi',
  'admin.user_reinstate': 'Navbatga qaytarildi',
  'admin.user_profile_update': 'Profil o‘zgartirildi',
  'admin.user_role_change': 'Rol o‘zgartirildi',
  'admin.user_suspend': 'Vaqtincha yopildi',
  'admin.user_activate': 'Qayta faollashtirildi',
  'admin.user_password_set': 'Parol administrator tomonidan almashtirildi',
  'admin.user_sessions_revoked': 'Barcha sessiyalar bekor qilindi',
  'admin.user_class_assign': 'Sinfga biriktirildi',
  'admin.user_class_remove': 'Sinfdan chiqarildi',
  'admin.user_email_verify': 'Email qo‘lda tasdiqlandi',
  'admin.user_reset_link_issue': 'Parol tiklash havolasi berildi',
  'admin.user_delete': 'Hisob o‘chirildi',
  'admin.user_purge': 'Hisob butunlay o‘chirildi',
};

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const emptyCreate = (): CreateDraft => ({
  fullName: '', email: '', username: '', password: '', role: 'student', classId: '', groupId: '',
});

/**
 * Owner-facing people console.
 *
 * The original approval queue is kept intact and extended into the rest of the
 * account lifecycle. Pending users are still the first-class workflow, while an
 * active user can now be edited, re-roled, moved between classes, given a new
 * password, signed out everywhere, suspended, audited, safely deleted or
 * explicitly purged.
 */
export function UserApprovalPanel({ classes, currentUserId }: {
  classes: ClassItem[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [issuedCode, setIssuedCode] = useState<{ userId: string; link: string; minutes: number } | null>(null);
  const [groups, setGroups] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyCreate());
  const [audit, setAudit] = useState<Record<string, AuditEvent[]>>({});
  const [auditOpen, setAuditOpen] = useState<string | null>(null);

  const loadGroups = useCallback(async (classId: string) => {
    if (!classId || groups[classId]) return;
    try {
      const result = await api<{ groups: Array<{ id: string; name: string }> }>(`/admin/users/groups/${classId}`);
      setGroups((current) => ({ ...current, [classId]: result.groups }));
    } catch {
      setGroups((current) => ({ ...current, [classId]: [] }));
    }
  }, [groups]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (search.trim()) params.set('q', search.trim());
      params.set('limit', '500');
      const suffix = params.size ? `?${params.toString()}` : '';
      const result = await api<{ users: ManagedUser[]; total?: number }>(`/admin/users${suffix}`);
      setUsers(result.users);
      setTotal(result.total ?? result.users.length);
      setSelected((current) => new Set([...current].filter((id) => result.users.some((user) => user.id === id))));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ro‘yxat yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, [filter, roleFilter, search]);

  useEffect(() => { void load(); }, [load]);

  const emptyDraftFor = (user: ManagedUser): Draft => ({
    role: user.role ?? 'student',
    classId: '',
    groupId: '',
    reason: '',
    fullName: user.fullName,
    email: user.email ?? '',
    username: user.username ?? '',
    password: '',
  });
  const draftFor = (user: ManagedUser) => ({ ...emptyDraftFor(user), ...(draft[user.id] ?? {}) });

  const setDraftFor = (user: ManagedUser, patch: Partial<Draft>) =>
    setDraft((current) => ({
      ...current,
      [user.id]: { ...emptyDraftFor(user), ...(current[user.id] ?? {}), ...patch },
    }));

  const act = async (id: string, action: () => Promise<unknown>, success?: string) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError
        ? [cause.message, cause.detail].filter(Boolean).join(' — ')
        : cause instanceof Error ? cause.message : 'Amal bajarilmadi.');
    } finally {
      setBusyId(null);
    }
  };

  const bulkAct = async (kind: 'suspend' | 'activate' | 'revoke') => {
    const ids = [...selected].filter((id) => id !== currentUserId);
    if (!ids.length) return;
    setError(null);
    setNotice(null);
    try {
      for (const id of ids) {
        if (kind === 'revoke') {
          await api(`/admin/users/${id}/revoke-sessions`, { method: 'POST', body: JSON.stringify({}) });
        } else {
          await api(`/admin/users/${id}/status`, {
            method: 'POST',
            body: JSON.stringify({ status: kind === 'suspend' ? 'suspended' : 'active' }),
          });
        }
      }
      setSelected(new Set());
      setNotice(`${ids.length} ta foydalanuvchida amal bajarildi.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ommaviy amal bajarilmadi.');
    }
  };

  const pendingCount = useMemo(() => users.filter((user) => user.status === 'pending').length, [users]);

  const createUser = async () => {
    if (!createDraft.fullName.trim() || !createDraft.password || (!createDraft.email.trim() && !createDraft.username.trim())) {
      setError('Ism, parol va email yoki username dan kamida bittasini kiriting.');
      return;
    }
    setBusyId('create');
    setError(null);
    try {
      await api('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: createDraft.fullName.trim(),
          email: createDraft.email.trim() || undefined,
          username: createDraft.username.trim() || undefined,
          password: createDraft.password,
          role: createDraft.role,
          ...(createDraft.classId ? { classId: createDraft.classId } : {}),
          ...(createDraft.role === 'student' && createDraft.classId && createDraft.groupId
            ? { groupId: createDraft.groupId } : {}),
        }),
      });
      setCreateDraft(emptyCreate());
      setShowCreate(false);
      setNotice('Yangi foydalanuvchi yaratildi.');
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError
        ? [cause.message, cause.detail].filter(Boolean).join(' — ')
        : 'Foydalanuvchi yaratilmadi.');
    } finally {
      setBusyId(null);
    }
  };

  const loadAudit = async (userId: string) => {
    if (auditOpen === userId) {
      setAuditOpen(null);
      return;
    }
    try {
      const result = await api<{ events: AuditEvent[] }>(`/admin/users/${userId}/audit`);
      setAudit((current) => ({ ...current, [userId]: result.events }));
      setAuditOpen(userId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audit tarixi yuklanmadi.');
    }
  };

  return (
    <section className="ua">
      <header className="ua-header">
        <div>
          <h2>Foydalanuvchilar</h2>
          <p className="ua-sub">
            {filter === 'pending' && pendingCount > 0
              ? `${pendingCount} ta ariza ko‘rib chiqilishini kutmoqda`
              : `${total} ta hisob — role, sinf, parol, holat va sessiyalarni shu yerdan boshqaring`}
          </p>
        </div>
        <button className="ua-primary-action" onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? 'Yopish' : '+ Yangi user'}
        </button>
      </header>

      {showCreate ? (
        <div className="ua-create">
          <div className="ua-create-head">
            <div><strong>Yangi foydalanuvchi</strong><span>Admin yaratgan hisob darhol faol bo‘ladi.</span></div>
          </div>
          <div className="ua-form-grid">
            <label className="ua-control"><span>To‘liq ism</span><input value={createDraft.fullName} onChange={(e) => setCreateDraft((d) => ({ ...d, fullName: e.target.value }))} /></label>
            <label className="ua-control"><span>Email</span><input type="email" value={createDraft.email} onChange={(e) => setCreateDraft((d) => ({ ...d, email: e.target.value }))} /></label>
            <label className="ua-control"><span>Username</span><input value={createDraft.username} onChange={(e) => setCreateDraft((d) => ({ ...d, username: e.target.value }))} /></label>
            <label className="ua-control"><span>Boshlang‘ich parol</span><input type="password" value={createDraft.password} onChange={(e) => setCreateDraft((d) => ({ ...d, password: e.target.value }))} /></label>
            <label className="ua-control"><span>Rol</span><select value={createDraft.role} onChange={(e) => setCreateDraft((d) => ({ ...d, role: e.target.value as Role, groupId: '' }))}>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label>
            <label className="ua-control"><span>Sinf</span><select value={createDraft.classId} onChange={(e) => { const classId = e.target.value; setCreateDraft((d) => ({ ...d, classId, groupId: '' })); void loadGroups(classId); }}><option value="">— tanlanmagan —</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            {createDraft.role === 'student' && createDraft.classId && (groups[createDraft.classId]?.length ?? 0) > 0 ? (
              <label className="ua-control"><span>Guruh</span><select value={createDraft.groupId} onChange={(e) => setCreateDraft((d) => ({ ...d, groupId: e.target.value }))}><option value="">— tanlanmagan —</option>{groups[createDraft.classId]!.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
            ) : null}
          </div>
          <button className="ua-approve ua-create-submit" disabled={busyId === 'create'} onClick={() => void createUser()}>{busyId === 'create' ? 'Yaratilmoqda…' : 'Hisob yaratish'}</button>
        </div>
      ) : null}

      <div className="ua-toolbar">
        <label className="ua-search"><span className="sr-only">Qidirish</span><input placeholder="Ism, email yoki username…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <div className="ua-filters" role="tablist" aria-label="Holat bo‘yicha filtr">
          {(['pending', 'active', 'suspended', 'rejected', 'all'] as const).map((value) => (
            <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Hammasi' : STATUS_LABEL[value]}</button>
          ))}
        </div>
        <select className="ua-role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}>
          <option value="all">Barcha rollar</option>
          {(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}
        </select>
      </div>

      {selected.size > 0 ? (
        <div className="ua-bulk" role="region" aria-label="Tanlangan foydalanuvchilar uchun amallar">
          <strong>{selected.size} ta tanlandi</strong>
          <button onClick={() => void bulkAct('suspend')}>To‘xtatish</button>
          <button onClick={() => void bulkAct('activate')}>Faollashtirish</button>
          <button onClick={() => void bulkAct('revoke')}>Sessiyalarni bekor qilish</button>
          <button onClick={() => setSelected(new Set())}>Tanlovni bekor qilish</button>
        </div>
      ) : null}

      {error ? <p className="ua-error" role="alert">{error}</p> : null}
      {notice ? <p className="ua-notice" role="status">{notice}</p> : null}

      {loading ? <p className="ua-empty">Yuklanmoqda…</p>
        : users.length === 0 ? <p className="ua-empty">Mos foydalanuvchi topilmadi.</p>
          : (
            <ul className="ua-list">
              {users.map((user) => {
                const current = draftFor(user);
                const busy = busyId === user.id;
                const memberships = user.memberships ?? [];
                const isSelf = user.id === currentUserId;
                return (
                  <li key={user.id} className={`ua-row ua-row--${user.status}`}>
                    <div className="ua-identity">
                      <input className="ua-check" type="checkbox" aria-label={`${user.fullName}ni tanlash`} disabled={isSelf} checked={selected.has(user.id)} onChange={(e) => setSelected((old) => { const next = new Set(old); if (e.target.checked) next.add(user.id); else next.delete(user.id); return next; })} />
                      <span className="ua-avatar" aria-hidden="true">{user.fullName.trim().charAt(0).toUpperCase()}</span>
                      <div className="ua-person">
                        <strong>{user.fullName}</strong>
                        <span className="ua-meta">{user.username ? `@${user.username}` : null}{user.username && user.email ? ' · ' : null}{user.email}</span>
                        <span className="ua-meta">Yaratilgan: {formatDate(user.createdAt)} · Oxirgi kirish: {formatDate(user.lastLoginAt)}</span>
                      </div>
                      <span className="ua-badges">
                        {user.role ? <span className={`ua-badge ua-badge--role-${user.role}`}>{ROLE_LABEL[user.role]}</span> : null}
                        {!user.emailVerified ? <span className="ua-badge ua-badge--unverified">Email tasdiqlanmagan</span> : null}
                        <span className={`ua-badge ua-badge--${user.status}`}>{STATUS_LABEL[user.status]}</span>
                      </span>
                    </div>

                    {memberships.length > 0 ? (
                      <div className="ua-memberships">{memberships.map((membership) => <span key={`${membership.kind}-${membership.classId}`} className="ua-class-chip">{membership.className}{membership.groupName ? ` · ${membership.groupName}` : ''}</span>)}</div>
                    ) : <span className="ua-no-class">Sinf biriktirilmagan</span>}

                    {user.note ? <p className="ua-note">“{user.note}”</p> : null}
                    {user.statusReason ? <p className="ua-reason">{user.statusReason}</p> : null}

                    {user.status === 'pending' ? (
                      <div className="ua-actions">
                        <label className="ua-control"><span>Rol</span><select value={current.role} onChange={(event) => setDraftFor(user, { role: event.target.value as Role })}>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label>
                        <label className="ua-control"><span>Sinf</span><select value={current.classId} onChange={(event) => { const classId = event.target.value; setDraftFor(user, { classId, groupId: '' }); void loadGroups(classId); }}><option value="">— tanlanmagan —</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                        {current.classId && current.role === 'student' && (groups[current.classId]?.length ?? 0) > 0 ? <label className="ua-control"><span>Guruh</span><select value={current.groupId} onChange={(event) => setDraftFor(user, { groupId: event.target.value })}><option value="">— tanlanmagan —</option>{groups[current.classId]!.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}
                        <button className="ua-approve" disabled={busy} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/approve`, { method: 'POST', body: JSON.stringify({ role: current.role, ...(current.classId ? { classId: current.classId } : {}), ...(current.classId && current.groupId && current.role === 'student' ? { groupId: current.groupId } : {}) }) }), 'Foydalanuvchi tasdiqlandi.')}>{busy ? '…' : 'Tasdiqlash'}</button>
                        <input className="ua-reason-input" placeholder="Rad etish sababi" value={current.reason} maxLength={300} onChange={(event) => setDraftFor(user, { reason: event.target.value })} />
                        <button className="ua-reject" disabled={busy || !current.reason.trim()} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/reject`, { method: 'POST', body: JSON.stringify({ reason: current.reason.trim() }) }), 'Ariza rad etildi.')}>Rad etish</button>
                        {!user.emailVerified ? <button className="ua-secondary" disabled={busy} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/verify-email`, { method: 'POST', body: JSON.stringify({}) }), 'Email tasdiqlandi.')}>Emailni tasdiqlash</button> : null}
                        <button className="ua-danger" disabled={busy} onClick={() => { if (!confirm(`${user.fullName} hisobini o‘chirasizmi?`)) return; void act(user.id, () => api(`/admin/users/${user.id}`, { method: 'DELETE' }), 'Hisob o‘chirildi.'); }}>O‘chirish</button>
                      </div>
                    ) : (
                      <details className="ua-manage">
                        <summary>Boshqarish</summary>
                        {isSelf ? <p className="ua-self">Bu sizning hisobingiz. O‘z rolingiz, holatingiz yoki hisobingizni bu yerdan o‘zgartirish bloklangan.</p> : null}

                        <div className="ua-section">
                          <h3>Profil</h3>
                          <div className="ua-form-grid">
                            <label className="ua-control"><span>To‘liq ism</span><input value={current.fullName} onChange={(e) => setDraftFor(user, { fullName: e.target.value })} /></label>
                            <label className="ua-control"><span>Email</span><input type="email" value={current.email} onChange={(e) => setDraftFor(user, { email: e.target.value })} /></label>
                            <label className="ua-control"><span>Username</span><input value={current.username} onChange={(e) => setDraftFor(user, { username: e.target.value })} /></label>
                          </div>
                          <button className="ua-secondary" disabled={busy} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ fullName: current.fullName.trim(), email: current.email.trim() || null, username: current.username.trim() || null }) }), 'Profil yangilandi.')}>Profilni saqlash</button>
                        </div>

                        {!isSelf ? (
                          <div className="ua-section">
                            <h3>Rol va sinf</h3>
                            <div className="ua-actions">
                              <label className="ua-control"><span>Rol</span><select value={current.role} onChange={(e) => setDraftFor(user, { role: e.target.value as Role, groupId: '' })}>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label>
                              <button className="ua-secondary" disabled={busy || current.role === user.role} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/role`, { method: 'POST', body: JSON.stringify({ role: current.role }) }), 'Rol yangilandi.')}>Rolni saqlash</button>
                              <label className="ua-control"><span>{current.role === 'student' ? 'Sinfga ko‘chirish' : 'Sinfga qo‘shish'}</span><select value={current.classId} onChange={(e) => { const classId = e.target.value; setDraftFor(user, { classId, groupId: '' }); void loadGroups(classId); }}><option value="">— sinfni tanlang —</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                              {current.role === 'student' && current.classId && (groups[current.classId]?.length ?? 0) > 0 ? <label className="ua-control"><span>Guruh</span><select value={current.groupId} onChange={(e) => setDraftFor(user, { groupId: e.target.value })}><option value="">— tanlanmagan —</option>{groups[current.classId]!.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}
                              <button className="ua-approve" disabled={busy || !current.classId} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/classes`, { method: 'POST', body: JSON.stringify({ classId: current.classId, ...(current.role === 'student' && current.groupId ? { groupId: current.groupId } : {}) }) }), 'Sinf biriktirildi.')}>Biriktirish</button>
                            </div>
                            {memberships.length > 0 ? <div className="ua-membership-list">{memberships.map((membership) => <div key={`${membership.kind}-${membership.classId}`}><span>{membership.className}{membership.groupName ? ` · ${membership.groupName}` : ''}</span><button className="ua-mini-danger" disabled={busy} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/classes/${membership.classId}`, { method: 'DELETE' }), 'Sinfdan chiqarildi.')}>Chiqarish</button></div>)}</div> : null}
                          </div>
                        ) : null}

                        <div className="ua-section">
                          <h3>Parol va sessiyalar</h3>
                          <div className="ua-actions">
                            <label className="ua-control ua-password"><span>Yangi parol</span><input type="password" minLength={8} placeholder="Kamida 8 belgi" value={current.password} onChange={(e) => setDraftFor(user, { password: e.target.value })} /></label>
                            <button className="ua-secondary" disabled={busy || current.password.length < 8} onClick={() => void act(user.id, async () => { await api(`/admin/users/${user.id}/password`, { method: 'POST', body: JSON.stringify({ password: current.password }) }); setDraftFor(user, { password: '' }); }, 'Parol almashtirildi va eski sessiyalar yopildi.')}>Parolni almashtirish</button>
                            <button className="ua-secondary" disabled={busy} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/revoke-sessions`, { method: 'POST', body: JSON.stringify({}) }), 'Barcha sessiyalar bekor qilindi.')}>Barcha qurilmalardan chiqarish</button>
                            {user.status === 'active' ? <button className="ua-secondary" disabled={busy} onClick={() => void act(user.id, async () => { const result = await api<{ link: string; expiresInMinutes: number }>(`/admin/users/${user.id}/reset-code`, { method: 'POST', body: JSON.stringify({}) }); setIssuedCode({ userId: user.id, link: result.link, minutes: result.expiresInMinutes }); })}>Tiklash havolasi</button> : null}
                          </div>
                        </div>

                        {!isSelf ? (
                          <div className="ua-section ua-section--danger">
                            <h3>Hisob holati va o‘chirish</h3>
                            <div className="ua-actions">
                              <input className="ua-reason-input" placeholder="To‘xtatish sababi (ixtiyoriy)" value={current.reason} maxLength={300} onChange={(e) => setDraftFor(user, { reason: e.target.value })} />
                              {user.status === 'active' ? <button className="ua-reject" disabled={busy} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'suspended', reason: current.reason.trim() || undefined }) }), 'Hisob vaqtincha yopildi.')}>Vaqtincha yopish</button> : user.status === 'suspended' ? <button className="ua-approve" disabled={busy} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'active' }) }), 'Hisob qayta faollashtirildi.')}>Qayta ochish</button> : user.status === 'rejected' ? <button className="ua-approve" disabled={busy} onClick={() => void act(user.id, () => api(`/admin/users/${user.id}/reinstate`, { method: 'POST', body: JSON.stringify({}) }), 'Ariza qayta navbatga qo‘yildi.')}>Navbatga qaytarish</button> : null}
                              <button className="ua-danger" disabled={busy} title="Faqat bog‘liq ma’lumoti bo‘lmagan hisob uchun" onClick={() => { if (!confirm(`${user.fullName} hisobini oddiy usulda o‘chirasizmi?`)) return; void act(user.id, () => api(`/admin/users/${user.id}`, { method: 'DELETE' }), 'Hisob o‘chirildi.'); }}>Oddiy o‘chirish</button>
                              <button className="ua-purge" disabled={busy} onClick={() => { if (!confirm('Bu amal qaytarilmaydi. Userga tegishli cascade ma’lumotlar ham o‘chishi mumkin. Davom etasizmi?')) return; const typed = prompt('Tasdiqlash uchun DELETE deb yozing'); if (typed !== 'DELETE') return; void act(user.id, () => api(`/admin/users/${user.id}/purge`, { method: 'POST', body: JSON.stringify({ confirm: 'DELETE' }) }), 'Hisob butunlay o‘chirildi.'); }}>Butunlay o‘chirish</button>
                            </div>
                          </div>
                        ) : null}

                        <div className="ua-section">
                          <button className="ua-secondary" onClick={() => void loadAudit(user.id)}>{auditOpen === user.id ? 'Audit tarixini yopish' : 'Audit tarixini ko‘rish'}</button>
                          {auditOpen === user.id ? <div className="ua-audit">{(audit[user.id] ?? []).length === 0 ? <span>Audit yozuvi yo‘q.</span> : (audit[user.id] ?? []).map((event) => <div key={event.id}><strong>{ACTION_LABEL[event.action] ?? event.action}</strong><span>{event.actorName} · {formatDate(event.createdAt)}</span></div>)}</div> : null}
                        </div>
                      </details>
                    )}

                    {issuedCode?.userId === user.id ? (
                      <div className="ua-code" role="status"><p>Bu havolani foydalanuvchiga bering. {issuedCode.minutes} daqiqa amal qiladi va bir marta ishlaydi.</p><code>{issuedCode.link}</code><div className="ua-code-actions"><button className="ua-secondary" onClick={() => void navigator.clipboard?.writeText(issuedCode.link)}>Nusxalash</button><button className="ua-secondary" onClick={() => setIssuedCode(null)}>Yopish</button></div></div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
    </section>
  );
}
