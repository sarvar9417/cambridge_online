import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api, type ClassItem } from '../lib/api';
import './user-approval.css';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';
type Role = 'owner' | 'teacher' | 'student';
type ManageTab = 'profile' | 'access' | 'security' | 'audit' | 'danger';

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

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;

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
  'admin.user_password_set': 'Parol almashtirildi',
  'admin.user_sessions_revoked': 'Sessiyalar bekor qilindi',
  'admin.user_class_assign': 'Sinfga biriktirildi',
  'admin.user_class_remove': 'Sinfdan chiqarildi',
  'admin.user_email_verify': 'Email tasdiqlandi',
  'admin.user_reset_link_issue': 'Tiklash havolasi yaratildi',
  'admin.user_delete': 'Hisob o‘chirildi',
  'admin.user_purge': 'Hisob butunlay o‘chirildi',
};

const TAB_LABEL: Record<ManageTab, string> = {
  profile: 'Profil',
  access: 'Rol va sinf',
  security: 'Xavfsizlik',
  audit: 'Faoliyat',
  danger: 'Danger zone',
};

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const emptyCreate = (): CreateDraft => ({
  fullName: '', email: '', username: '', password: '', role: 'student', classId: '', groupId: '',
});

const initials = (name: string) => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('') || '?';

interface UserQuery {
  status: Status | 'all';
  role: Role | 'all';
  q: string;
  offset: number;
  preferredId?: string;
}

export function UserApprovalPanel({ classes, currentUserId }: {
  classes: ClassItem[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [issuedCode, setIssuedCode] = useState<{ userId: string; link: string; minutes: number } | null>(null);
  const [groups, setGroups] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ManageTab>('profile');
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyCreate());
  const [audit, setAudit] = useState<Record<string, AuditEvent[]>>({});
  const [auditLoading, setAuditLoading] = useState<string | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setOffset(0);
      setDebouncedSearch(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const invalidateAudit = (userId: string) => setAudit((current) => {
    if (!(userId in current)) return current;
    const next = { ...current };
    delete next[userId];
    return next;
  });

  const loadGroups = useCallback(async (classId: string) => {
    if (!classId || groups[classId]) return;
    try {
      const result = await api<{ groups: Array<{ id: string; name: string }> }>(`/admin/users/groups/${classId}`);
      setGroups((current) => ({ ...current, [classId]: result.groups }));
    } catch (cause) {
      setGroups((current) => ({ ...current, [classId]: [] }));
      setError(cause instanceof Error ? cause.message : 'Guruhlar yuklanmadi.');
    }
  }, [groups]);

  const fetchUsers = useCallback(async (query: UserQuery) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.status !== 'all') params.set('status', query.status);
      if (query.role !== 'all') params.set('role', query.role);
      if (query.q) params.set('q', query.q);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(query.offset));
      const result = await api<{ users: ManagedUser[]; total?: number }>(`/admin/users?${params.toString()}`);
      if (requestId !== requestSequence.current) return;
      const nextTotal = result.total ?? result.users.length;
      if (result.users.length === 0 && nextTotal > 0 && query.offset > 0) {
        const lastOffset = Math.floor((nextTotal - 1) / PAGE_SIZE) * PAGE_SIZE;
        if (lastOffset !== query.offset) {
          setOffset(lastOffset);
          return;
        }
      }
      setUsers(result.users);
      setTotal(nextTotal);
      setSelected((current) => new Set([...current].filter((id) => result.users.some((user) => user.id === id))));
      if (query.preferredId && result.users.some((user) => user.id === query.preferredId)) {
        setSelectedUserId(query.preferredId);
      }
      setError(null);
    } catch (cause) {
      if (requestId === requestSequence.current) {
        setError(cause instanceof Error ? cause.message : 'Ro‘yxat yuklanmadi.');
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, []);

  const load = useCallback(() => fetchUsers({
    status: filter, role: roleFilter, q: debouncedSearch, offset,
  }), [debouncedSearch, fetchUsers, filter, offset, roleFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (users.length === 0) {
      setSelectedUserId(null);
      return;
    }
    if (!selectedUserId || !users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(users[0].id);
      setActiveTab(users[0].status === 'pending' ? 'access' : 'profile');
    }
  }, [users, selectedUserId]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(pageCount, Math.floor(offset / PAGE_SIZE) + 1);
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + users.length, total);

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
  const setDraftFor = (user: ManagedUser, patch: Partial<Draft>) => setDraft((current) => ({
    ...current,
    [user.id]: { ...emptyDraftFor(user), ...(current[user.id] ?? {}), ...patch },
  }));

  const act = async (id: string, action: () => Promise<unknown>, success?: string) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      invalidateAudit(id);
      if (success) setNotice(success);
      await fetchUsers({ status: filter, role: roleFilter, q: debouncedSearch, offset });
    } catch (cause) {
      setError(cause instanceof ApiError
        ? [cause.message, cause.detail].filter(Boolean).join(' — ')
        : cause instanceof Error ? cause.message : 'Amal bajarilmadi.');
    } finally {
      setBusyId(null);
    }
  };

  const bulkAct = async (kind: 'suspend' | 'activate' | 'revoke') => {
    const chosen = users.filter((user) => selected.has(user.id) && user.id !== currentUserId);
    const eligible = chosen.filter((user) => kind === 'suspend'
      ? user.status === 'active'
      : kind === 'activate'
        ? user.status === 'suspended'
        : ['active', 'suspended'].includes(user.status));
    const skipped = chosen.length - eligible.length;
    if (!eligible.length) {
      setNotice('Tanlangan userlarning holati bu ommaviy amal uchun mos emas.');
      return;
    }
    setError(null);
    setNotice(null);
    const results = await Promise.allSettled(eligible.map(async (user) => {
      if (kind === 'revoke') {
        await api(`/admin/users/${user.id}/revoke-sessions`, { method: 'POST', body: JSON.stringify({}) });
      } else {
        await api(`/admin/users/${user.id}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: kind === 'suspend' ? 'suspended' : 'active' }),
        });
      }
      invalidateAudit(user.id);
    }));
    const succeeded = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    setSelected(new Set());
    if (failed) setError(`${succeeded} ta bajarildi, ${failed} ta bajarilmadi${skipped ? `, ${skipped} ta mos kelmagani uchun o‘tkazib yuborildi` : ''}.`);
    else setNotice(`${succeeded} ta foydalanuvchida amal bajarildi${skipped ? `, ${skipped} ta mos kelmagani uchun o‘tkazib yuborildi` : ''}.`);
    await fetchUsers({ status: filter, role: roleFilter, q: debouncedSearch, offset });
  };

  const createUser = async () => {
    if (!createDraft.fullName.trim() || createDraft.password.length < 8 || (!createDraft.email.trim() && !createDraft.username.trim())) {
      setError('Ism, kamida 8 belgili parol va email yoki username dan kamida bittasini kiriting.');
      return;
    }
    setBusyId('create');
    setError(null);
    try {
      const result = await api<{ user: ManagedUser }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: createDraft.fullName.trim(), email: createDraft.email.trim() || undefined,
          username: createDraft.username.trim() || undefined, password: createDraft.password,
          role: createDraft.role, ...(createDraft.classId ? { classId: createDraft.classId } : {}),
          ...(createDraft.role === 'student' && createDraft.classId && createDraft.groupId ? { groupId: createDraft.groupId } : {}),
        }),
      });
      setCreateDraft(emptyCreate());
      setShowCreate(false);
      setFilter('all');
      setRoleFilter('all');
      setSearch('');
      setDebouncedSearch('');
      setOffset(0);
      setNotice('Yangi foydalanuvchi yaratildi.');
      setSelectedUserId(result.user.id);
      setActiveTab('profile');
      await fetchUsers({ status: 'all', role: 'all', q: '', offset: 0, preferredId: result.user.id });
    } catch (cause) {
      setError(cause instanceof ApiError ? [cause.message, cause.detail].filter(Boolean).join(' — ') : 'Foydalanuvchi yaratilmadi.');
    } finally { setBusyId(null); }
  };

  const loadAudit = async (userId: string, force = false) => {
    if (audit[userId] && !force) return;
    setAuditLoading(userId);
    try {
      const result = await api<{ events: AuditEvent[] }>(`/admin/users/${userId}/audit`);
      setAudit((current) => ({ ...current, [userId]: result.events }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audit tarixi yuklanmadi.');
    } finally { setAuditLoading(null); }
  };

  const selectUser = (user: ManagedUser) => {
    setSelectedUserId(user.id);
    setActiveTab(user.status === 'pending' ? 'access' : 'profile');
    setIssuedCode(null);
  };

  const selectedCurrent = selectedUser ? draftFor(selectedUser) : null;
  const selectedBusy = selectedUser ? busyId === selectedUser.id : false;
  const selectedSelf = selectedUser?.id === currentUserId;
  const memberships = selectedUser?.memberships ?? [];
  const createReady = createDraft.fullName.trim().length >= 2
    && createDraft.password.length >= 8
    && Boolean(createDraft.email.trim() || createDraft.username.trim());

  return (
    <section className="ua">
      <header className="ua-header">
        <div className="ua-title-block">
          <span className="ua-kicker">Boshqaruv · Odamlar</span>
          <div className="ua-title-row"><h2>Foydalanuvchilar</h2><span className="ua-total">{total}</span></div>
          <p className="ua-sub">Accountlar, rollar, sinflar va xavfsizlikni bitta boshqaruv markazidan nazorat qiling.</p>
        </div>
        <button type="button" className="ua-button ua-button--primary ua-new-user" onClick={() => setShowCreate((value) => !value)}>{showCreate ? 'Yaratishni yopish' : '+ Yangi foydalanuvchi'}</button>
      </header>

      <div className="ua-summary-strip">
        <div><span>Jami natija</span><strong>{total}</strong></div>
        <div><span>Sahifa</span><strong>{currentPage} / {pageCount}</strong></div>
        <div><span>Tanlangan</span><strong>{selected.size}</strong></div>
        <div><span>Filter</span><strong>{filter === 'all' ? 'Hammasi' : STATUS_LABEL[filter]}</strong></div>
      </div>

      {showCreate ? <section className="ua-create">
        <div className="ua-card-heading"><div><span className="ua-eyebrow">New account</span><h3>Yangi foydalanuvchi</h3></div><span className="ua-card-hint">Admin yaratgan hisob darhol faol bo‘ladi.</span></div>
        <div className="ua-form-grid">
          <label className="ua-control"><span>To‘liq ism</span><input value={createDraft.fullName} onChange={(e) => setCreateDraft((d) => ({ ...d, fullName: e.target.value }))}/></label>
          <label className="ua-control"><span>Email</span><input type="email" value={createDraft.email} onChange={(e) => setCreateDraft((d) => ({ ...d, email: e.target.value }))}/></label>
          <label className="ua-control"><span>Username</span><input value={createDraft.username} onChange={(e) => setCreateDraft((d) => ({ ...d, username: e.target.value }))}/></label>
          <label className="ua-control"><span>Boshlang‘ich parol</span><input type="password" minLength={8} value={createDraft.password} onChange={(e) => setCreateDraft((d) => ({ ...d, password: e.target.value }))}/></label>
          <label className="ua-control"><span>Rol</span><select value={createDraft.role} onChange={(e) => setCreateDraft((d) => ({ ...d, role: e.target.value as Role, groupId: '' }))}>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label>
          <label className="ua-control"><span>Sinf</span><select value={createDraft.classId} onChange={(e) => { const classId = e.target.value; setCreateDraft((d) => ({ ...d, classId, groupId: '' })); void loadGroups(classId); }}><option value="">— tanlanmagan —</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {createDraft.role === 'student' && createDraft.classId && (groups[createDraft.classId]?.length ?? 0) > 0 ? <label className="ua-control"><span>Guruh</span><select value={createDraft.groupId} onChange={(e) => setCreateDraft((d) => ({ ...d, groupId: e.target.value }))}><option value="">— tanlanmagan —</option>{groups[createDraft.classId]!.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}
        </div>
        <div className="ua-card-actions"><button type="button" className="ua-button ua-button--primary" disabled={busyId === 'create' || !createReady} onClick={() => void createUser()}>{busyId === 'create' ? 'Yaratilmoqda…' : 'Hisob yaratish'}</button><button type="button" className="ua-button" onClick={() => { setShowCreate(false); setCreateDraft(emptyCreate()); }}>Bekor qilish</button></div>
      </section> : null}

      <section className="ua-toolbar">
        <label className="ua-search"><span className="sr-only">Qidirish</span><span className="ua-search-icon" aria-hidden="true">⌕</span><input placeholder="Ism, email yoki username bo‘yicha qidiring…" value={search} onChange={(e) => setSearch(e.target.value)}/></label>
        <div className="ua-filters" role="tablist" aria-label="Holat bo‘yicha filtr">{(['pending', 'active', 'suspended', 'rejected', 'all'] as const).map((value) => <button type="button" key={value} role="tab" aria-selected={filter === value} className={filter === value ? 'is-active' : ''} onClick={() => { setFilter(value); setOffset(0); }}>{value === 'all' ? 'Hammasi' : STATUS_LABEL[value]}</button>)}</div>
        <label className="ua-select-wrap"><span>Rol</span><select className="ua-role-filter" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as Role | 'all'); setOffset(0); }}><option value="all">Barcha rollar</option>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label>
      </section>

      {selected.size > 0 ? <div className="ua-bulk" role="region" aria-label="Tanlangan foydalanuvchilar uchun amallar"><div><strong>{selected.size} ta tanlandi</strong><span>Faqat amal uchun mos holatdagi userlar o‘zgartiriladi.</span></div><div className="ua-bulk-actions"><button type="button" className="ua-button ua-button--small" onClick={() => void bulkAct('suspend')}>To‘xtatish</button><button type="button" className="ua-button ua-button--small" onClick={() => void bulkAct('activate')}>Faollashtirish</button><button type="button" className="ua-button ua-button--small" onClick={() => void bulkAct('revoke')}>Sessiyalarni yopish</button><button type="button" className="ua-button ua-button--small" onClick={() => setSelected(new Set())}>Bekor qilish</button></div></div> : null}
      {error ? <p className="ua-message ua-message--error" role="alert">{error}</p> : null}
      {notice ? <p className="ua-message ua-message--success" role="status">{notice}</p> : null}

      <div className="ua-workspace">
        <div className="ua-directory">
          <div className="ua-directory-head"><div><strong>Foydalanuvchilar</strong><span>{loading ? 'Yuklanmoqda…' : total ? `${rangeStart}–${rangeEnd} / ${total}` : '0 ta natija'}</span></div><button type="button" className="ua-icon-button" title="Yangilash" aria-label="Ro‘yxatni yangilash" onClick={() => void load()}>↻</button></div>
          {loading && users.length === 0 ? <div className="ua-empty-state"><span className="ua-empty-icon">…</span><strong>Ro‘yxat yuklanmoqda</strong></div> : users.length === 0 ? <div className="ua-empty-state"><span className="ua-empty-icon">⌕</span><strong>Mos foydalanuvchi topilmadi</strong><span>Filter yoki qidiruv so‘zini o‘zgartiring.</span></div> : <ul className={`ua-list${loading ? ' is-refreshing' : ''}`}>{users.map((user) => {
            const isSelf = user.id === currentUserId; const userMemberships = user.memberships ?? []; const isSelected = selectedUserId === user.id;
            return <li key={user.id} className={isSelected ? 'is-selected' : ''}><div className="ua-user-row">
              <input className="ua-check" type="checkbox" aria-label={`${user.fullName}ni tanlash`} disabled={isSelf} checked={selected.has(user.id)} onChange={(e) => setSelected((old) => { const next = new Set(old); if (e.target.checked) next.add(user.id); else next.delete(user.id); return next; })}/>
              <button type="button" className="ua-user-button" aria-current={isSelected ? 'true' : undefined} onClick={() => selectUser(user)}>
                <span className="ua-avatar">{initials(user.fullName)}</span>
                <span className="ua-person"><span className="ua-person-line"><strong>{user.fullName}</strong>{isSelf ? <span className="ua-you">Siz</span> : null}</span><span className="ua-meta">{user.username ? `@${user.username}` : user.email ?? 'Identifier yo‘q'}</span><span className="ua-row-foot"><span className={`ua-status-dot ua-status-dot--${user.status}`}/><span>{STATUS_LABEL[user.status]}</span>{userMemberships[0] ? <><span>·</span><span>{userMemberships[0].className}</span></> : null}</span></span>
                <span className="ua-row-badges">{user.role ? <span className={`ua-badge ua-badge--role-${user.role}`}>{ROLE_LABEL[user.role]}</span> : null}{user.email && !user.emailVerified ? <span className="ua-badge ua-badge--unverified">Email?</span> : null}<span className="ua-chevron">›</span></span>
              </button>
            </div></li>;
          })}</ul>}
          <div className="ua-pagination" aria-label="Sahifalash"><span>{total ? `${rangeStart}–${rangeEnd} / ${total}` : 'Natija yo‘q'}</span><div><button type="button" className="ua-button ua-button--small" disabled={loading || offset === 0} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}>← Oldingi</button><span className="ua-page-info">{currentPage} / {pageCount}</span><button type="button" className="ua-button ua-button--small" disabled={loading || offset + PAGE_SIZE >= total} onClick={() => setOffset((value) => value + PAGE_SIZE)}>Keyingi →</button></div></div>
        </div>

        <aside className="ua-inspector">
          {!selectedUser || !selectedCurrent ? <div className="ua-empty-state ua-empty-state--inspector"><span className="ua-empty-icon">👤</span><strong>Userni tanlang</strong><span>Boshqarish uchun chap tomondagi ro‘yxatdan foydalanuvchini tanlang.</span></div> : <>
            <header className="ua-inspector-header">
              <div className="ua-inspector-identity"><span className="ua-avatar ua-avatar--large">{initials(selectedUser.fullName)}</span><div><div className="ua-person-line"><h3>{selectedUser.fullName}</h3>{selectedSelf ? <span className="ua-you">Siz</span> : null}</div><span>{selectedUser.email ?? selectedUser.username ?? 'Identifier yo‘q'}</span></div></div>
              <div className="ua-inspector-badges">{selectedUser.role ? <span className={`ua-badge ua-badge--role-${selectedUser.role}`}>{ROLE_LABEL[selectedUser.role]}</span> : null}<span className={`ua-badge ua-badge--${selectedUser.status}`}>{STATUS_LABEL[selectedUser.status]}</span>{selectedUser.email && !selectedUser.emailVerified ? <span className="ua-badge ua-badge--unverified">Email tasdiqlanmagan</span> : null}</div>
              <dl className="ua-facts"><div><dt>Yaratilgan</dt><dd>{formatDate(selectedUser.createdAt)}</dd></div><div><dt>Oxirgi kirish</dt><dd>{formatDate(selectedUser.lastLoginAt)}</dd></div><div><dt>Sinf</dt><dd>{memberships.length || '—'}</dd></div></dl>
              {selectedUser.note ? <p className="ua-note">“{selectedUser.note}”</p> : null}{selectedUser.statusReason ? <p className="ua-reason">{selectedUser.statusReason}</p> : null}
            </header>

            <div className="ua-inspector-body">
              {selectedUser.status === 'pending' ? <div className="ua-panel-stack">
                <div className="ua-callout ua-callout--pending"><strong>Tasdiqlash kutilmoqda</strong><span>Rol va sinfni tekshirib, arizani tasdiqlang yoki sabab bilan rad eting.</span></div>
                <section className="ua-card"><div className="ua-card-heading"><div><span className="ua-eyebrow">Kirish huquqi</span><h3>Rol va joylashuv</h3></div></div><div className="ua-form-grid ua-form-grid--2">
                  <label className="ua-control"><span>Rol</span><select value={selectedCurrent.role} onChange={(e) => setDraftFor(selectedUser, { role: e.target.value as Role, groupId: '' })}>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label>
                  <label className="ua-control"><span>Sinf</span><select value={selectedCurrent.classId} onChange={(e) => { const classId = e.target.value; setDraftFor(selectedUser, { classId, groupId: '' }); void loadGroups(classId); }}><option value="">— tanlanmagan —</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  {selectedCurrent.classId && selectedCurrent.role === 'student' && (groups[selectedCurrent.classId]?.length ?? 0) > 0 ? <label className="ua-control"><span>Guruh</span><select value={selectedCurrent.groupId} onChange={(e) => setDraftFor(selectedUser, { groupId: e.target.value })}><option value="">— tanlanmagan —</option>{groups[selectedCurrent.classId]!.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}
                </div><div className="ua-card-actions"><button type="button" className="ua-button ua-button--primary" disabled={selectedBusy} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/approve`, { method: 'POST', body: JSON.stringify({ role: selectedCurrent.role, ...(selectedCurrent.classId ? { classId: selectedCurrent.classId } : {}), ...(selectedCurrent.classId && selectedCurrent.groupId && selectedCurrent.role === 'student' ? { groupId: selectedCurrent.groupId } : {}) }) }), 'Foydalanuvchi tasdiqlandi.')}>Tasdiqlash</button>{selectedUser.email && !selectedUser.emailVerified ? <button type="button" className="ua-button" disabled={selectedBusy} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/verify-email`, { method: 'POST', body: JSON.stringify({}) }), 'Email tasdiqlandi.')}>Emailni tasdiqlash</button> : null}</div></section>
                <section className="ua-card ua-card--warning"><div className="ua-card-heading"><div><span className="ua-eyebrow">Rad etish</span><h3>Arizani yopish</h3></div></div><label className="ua-control"><span>Sabab</span><textarea className="ua-textarea" placeholder="Rad etish sababini yozing" value={selectedCurrent.reason} maxLength={300} onChange={(e) => setDraftFor(selectedUser, { reason: e.target.value })}/></label><div className="ua-card-actions"><button type="button" className="ua-button ua-button--warning" disabled={selectedBusy || !selectedCurrent.reason.trim()} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/reject`, { method: 'POST', body: JSON.stringify({ reason: selectedCurrent.reason.trim() }) }), 'Ariza rad etildi.')}>Rad etish</button></div></section>
                <section className="ua-card ua-card--danger"><div className="ua-card-heading"><div><span className="ua-eyebrow">Keraksiz ariza</span><h3>Arizani o‘chirish</h3></div><span className="ua-card-hint">Bog‘liq ma’lumoti bo‘lmasa, hisob xavfsiz o‘chiriladi.</span></div><div className="ua-card-actions"><button type="button" className="ua-button ua-button--danger-ghost" disabled={selectedBusy} onClick={() => { if (!confirm(`${selectedUser.fullName} arizasini o‘chirasizmi?`)) return; void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}`, { method: 'DELETE' }), 'Ariza o‘chirildi.'); }}>Arizani o‘chirish</button></div></section>
              </div> : <>
                <nav className="ua-tabs" role="tablist" aria-label="Foydalanuvchini boshqarish bo‘limlari">{(Object.keys(TAB_LABEL) as ManageTab[]).map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab} key={tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => { setActiveTab(tab); if (tab === 'audit') void loadAudit(selectedUser.id); }}>{TAB_LABEL[tab]}</button>)}</nav>
                {selectedSelf ? <div className="ua-callout"><strong>Bu sizning hisobingiz</strong><span>Profil va xavfsizlik amallari mavjud. O‘z rolingiz, holatingiz yoki hisobingizni o‘chirish bloklangan.</span></div> : null}

                {activeTab === 'profile' ? <section className="ua-card"><div className="ua-card-heading"><div><span className="ua-eyebrow">Identity</span><h3>Profil ma’lumotlari</h3></div><span className="ua-card-hint">Email o‘zgarsa yangi manzil qayta tasdiqlanishi kerak. Email yoki username dan kamida bittasi qoladi.</span></div><div className="ua-form-grid"><label className="ua-control"><span>To‘liq ism</span><input value={selectedCurrent.fullName} onChange={(e) => setDraftFor(selectedUser, { fullName: e.target.value })}/></label><label className="ua-control"><span>Email</span><input type="email" value={selectedCurrent.email} onChange={(e) => setDraftFor(selectedUser, { email: e.target.value })}/></label><label className="ua-control"><span>Username</span><input value={selectedCurrent.username} onChange={(e) => setDraftFor(selectedUser, { username: e.target.value })}/></label></div><div className="ua-card-actions"><button type="button" className="ua-button ua-button--primary" disabled={selectedBusy || !selectedCurrent.fullName.trim() || (!selectedCurrent.email.trim() && !selectedCurrent.username.trim())} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}`, { method: 'PATCH', body: JSON.stringify({ fullName: selectedCurrent.fullName.trim(), email: selectedCurrent.email.trim() || null, username: selectedCurrent.username.trim() || null }) }), 'Profil yangilandi.')}>O‘zgarishlarni saqlash</button></div></section> : null}

                {activeTab === 'access' ? <div className="ua-panel-stack"><section className="ua-card"><div className="ua-card-heading"><div><span className="ua-eyebrow">Authorization</span><h3>Rol</h3></div><span className="ua-card-hint">Rol o‘zgarsa eski sessiyalar avtomatik bekor qilinadi.</span></div><div className="ua-inline-form"><label className="ua-control"><span>Joriy rol</span><select value={selectedCurrent.role} disabled={selectedSelf || !['active', 'suspended'].includes(selectedUser.status)} onChange={(e) => setDraftFor(selectedUser, { role: e.target.value as Role, groupId: '' })}>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label><button type="button" className="ua-button ua-button--primary" disabled={selectedBusy || selectedSelf || !['active', 'suspended'].includes(selectedUser.status) || selectedCurrent.role === selectedUser.role} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/role`, { method: 'POST', body: JSON.stringify({ role: selectedCurrent.role }) }), 'Rol yangilandi.')}>Rolni yangilash</button></div></section>
                  <section className="ua-card"><div className="ua-card-heading"><div><span className="ua-eyebrow">Membership</span><h3>Sinf va guruhlar</h3></div></div><div className="ua-memberships">{memberships.length ? memberships.map((m) => <span key={`${m.kind}-${m.classId}`} className="ua-class-chip">{m.className}{m.groupName ? ` · ${m.groupName}` : ''}</span>) : <span className="ua-no-class">Sinf biriktirilmagan</span>}</div>{!selectedSelf && ['active', 'suspended'].includes(selectedUser.status) ? <div className="ua-inline-form ua-inline-form--top"><label className="ua-control"><span>{selectedCurrent.role === 'student' ? 'Sinfga ko‘chirish' : 'Sinfga qo‘shish'}</span><select value={selectedCurrent.classId} onChange={(e) => { const classId = e.target.value; setDraftFor(selectedUser, { classId, groupId: '' }); void loadGroups(classId); }}><option value="">— sinfni tanlang —</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{selectedCurrent.role === 'student' && selectedCurrent.classId && (groups[selectedCurrent.classId]?.length ?? 0) > 0 ? <label className="ua-control"><span>Guruh</span><select value={selectedCurrent.groupId} onChange={(e) => setDraftFor(selectedUser, { groupId: e.target.value })}><option value="">— tanlanmagan —</option>{groups[selectedCurrent.classId]!.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}<button type="button" className="ua-button ua-button--primary" disabled={selectedBusy || !selectedCurrent.classId} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/classes`, { method: 'POST', body: JSON.stringify({ classId: selectedCurrent.classId, ...(selectedCurrent.role === 'student' && selectedCurrent.groupId ? { groupId: selectedCurrent.groupId } : {}) }) }), 'Sinf biriktirildi.')}>Biriktirish</button></div> : selectedUser.status === 'rejected' ? <div className="ua-muted-box">Rad etilgan hisobni avval “Danger zone” orqali navbatga qaytaring va qayta tasdiqlang.</div> : null}{memberships.length > 0 && !selectedSelf && ['active', 'suspended'].includes(selectedUser.status) ? <div className="ua-membership-list">{memberships.map((m) => <div key={`${m.kind}-${m.classId}`}><div><strong>{m.className}</strong><span>{m.groupName ?? (m.kind === 'teacher' ? 'O‘qituvchi' : 'Guruhsiz')}</span></div><button type="button" className="ua-button ua-button--danger-ghost ua-button--small" disabled={selectedBusy} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/classes/${m.classId}`, { method: 'DELETE' }), 'Sinfdan chiqarildi.')}>Chiqarish</button></div>)}</div> : null}</section></div> : null}

                {activeTab === 'security' ? <div className="ua-panel-stack"><section className="ua-card"><div className="ua-card-heading"><div><span className="ua-eyebrow">Credentials</span><h3>Parol</h3></div><span className="ua-card-hint">Yangi parol o‘rnatilganda barcha eski sessiyalar yopiladi.</span></div><div className="ua-inline-form"><label className="ua-control ua-control--grow"><span>Yangi parol</span><input type="password" minLength={8} placeholder="Kamida 8 belgi" value={selectedCurrent.password} onChange={(e) => setDraftFor(selectedUser, { password: e.target.value })}/></label><button type="button" className="ua-button ua-button--primary" disabled={selectedBusy || selectedCurrent.password.length < 8} onClick={() => void act(selectedUser.id, async () => { await api(`/admin/users/${selectedUser.id}/password`, { method: 'POST', body: JSON.stringify({ password: selectedCurrent.password }) }); setDraftFor(selectedUser, { password: '' }); }, 'Parol almashtirildi va eski sessiyalar yopildi.')}>Parolni almashtirish</button></div></section>
                  <section className="ua-card"><div className="ua-card-heading"><div><span className="ua-eyebrow">Sessions</span><h3>Kirish sessiyalari</h3></div></div><div className="ua-card-actions"><button type="button" className="ua-button" disabled={selectedBusy} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/revoke-sessions`, { method: 'POST', body: JSON.stringify({}) }), 'Barcha sessiyalar bekor qilindi.')}>Barcha qurilmalardan chiqarish</button>{selectedUser.status === 'active' ? <button type="button" className="ua-button" disabled={selectedBusy} onClick={() => void act(selectedUser.id, async () => { const result = await api<{ link: string; expiresInMinutes: number }>(`/admin/users/${selectedUser.id}/reset-code`, { method: 'POST', body: JSON.stringify({}) }); setIssuedCode({ userId: selectedUser.id, link: result.link, minutes: result.expiresInMinutes }); })}>Tiklash havolasi yaratish</button> : null}{selectedUser.email && !selectedUser.emailVerified ? <button type="button" className="ua-button" disabled={selectedBusy} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/verify-email`, { method: 'POST', body: JSON.stringify({}) }), 'Email tasdiqlandi.')}>Emailni tasdiqlash</button> : null}</div>{issuedCode?.userId === selectedUser.id ? <div className="ua-code"><div><strong>Bir martalik tiklash havolasi</strong><span>{issuedCode.minutes} daqiqa amal qiladi.</span></div><code>{issuedCode.link}</code><div className="ua-card-actions"><button type="button" className="ua-button ua-button--small" onClick={() => void navigator.clipboard?.writeText(issuedCode.link)}>Nusxalash</button><button type="button" className="ua-button ua-button--small" onClick={() => setIssuedCode(null)}>Yopish</button></div></div> : null}</section></div> : null}

                {activeTab === 'audit' ? <section className="ua-card"><div className="ua-card-heading"><div><span className="ua-eyebrow">Audit log</span><h3>Account faoliyati</h3></div><button type="button" className="ua-button ua-button--small" disabled={auditLoading === selectedUser.id} onClick={() => void loadAudit(selectedUser.id, true)}>Yangilash</button></div>{auditLoading === selectedUser.id ? <div className="ua-audit-empty">Audit tarixi yuklanmoqda…</div> : (audit[selectedUser.id] ?? []).length === 0 ? <div className="ua-audit-empty">Audit yozuvi yo‘q.</div> : <div className="ua-timeline">{(audit[selectedUser.id] ?? []).map((event) => <div className="ua-timeline-item" key={event.id}><span className="ua-timeline-dot"/><div><strong>{ACTION_LABEL[event.action] ?? event.action}</strong><span>{event.actorName} · {formatDate(event.createdAt)}</span></div></div>)}</div>}</section> : null}

                {activeTab === 'danger' ? <div className="ua-panel-stack"><section className="ua-card ua-card--warning"><div className="ua-card-heading"><div><span className="ua-eyebrow">Account state</span><h3>Hisob holati</h3></div></div>{!selectedSelf ? <><label className="ua-control"><span>Sabab</span><textarea className="ua-textarea" placeholder="To‘xtatish sababi (ixtiyoriy)" value={selectedCurrent.reason} maxLength={300} onChange={(e) => setDraftFor(selectedUser, { reason: e.target.value })}/></label><div className="ua-card-actions">{selectedUser.status === 'active' ? <button type="button" className="ua-button ua-button--warning" disabled={selectedBusy} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'suspended', reason: selectedCurrent.reason.trim() || undefined }) }), 'Hisob vaqtincha yopildi.')}>Vaqtincha yopish</button> : null}{selectedUser.status === 'suspended' ? <button type="button" className="ua-button ua-button--primary" disabled={selectedBusy} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'active' }) }), 'Hisob qayta faollashtirildi.')}>Qayta faollashtirish</button> : null}{selectedUser.status === 'rejected' ? <button type="button" className="ua-button ua-button--primary" disabled={selectedBusy} onClick={() => void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/reinstate`, { method: 'POST', body: JSON.stringify({}) }), 'Ariza qayta navbatga qo‘yildi.')}>Navbatga qaytarish</button> : null}</div></> : <div className="ua-muted-box">O‘z hisobingiz holatini bu paneldan o‘zgartira olmaysiz.</div>}</section>
                  <section className="ua-card ua-card--danger"><div className="ua-card-heading"><div><span className="ua-eyebrow">Irreversible</span><h3>Hisobni o‘chirish</h3></div></div>{!selectedSelf ? <div className="ua-danger-actions"><div><div><strong>Oddiy o‘chirish</strong><span>Academic yoki administrative tarix mavjud bo‘lsa server bu amalni bloklaydi va sababini ko‘rsatadi.</span></div><button type="button" className="ua-button ua-button--danger-ghost" disabled={selectedBusy} onClick={() => { if (!confirm(`${selectedUser.fullName} hisobini oddiy usulda o‘chirasizmi?`)) return; void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}`, { method: 'DELETE' }), 'Hisob o‘chirildi.'); }}>O‘chirish</button></div><div><div><strong>Permanent purge</strong><span>Qaytarib bo‘lmaydi. Historical references xavfsiz saqlanadi yoki ownerga transfer qilinadi.</span></div><button type="button" className="ua-button ua-button--danger" disabled={selectedBusy} onClick={() => { if (!confirm('Bu amal qaytarilmaydi. Davom etasizmi?')) return; const typed = prompt('Tasdiqlash uchun DELETE deb yozing'); if (typed !== 'DELETE') return; void act(selectedUser.id, () => api(`/admin/users/${selectedUser.id}/purge`, { method: 'POST', body: JSON.stringify({ confirm: 'DELETE' }) }), 'Hisob butunlay o‘chirildi.'); }}>Butunlay o‘chirish</button></div></div> : <div className="ua-muted-box">O‘z hisobingizni o‘chirish bloklangan.</div>}</section></div> : null}
              </>}
            </div>
          </>}
        </aside>
      </div>
    </section>
  );
}
