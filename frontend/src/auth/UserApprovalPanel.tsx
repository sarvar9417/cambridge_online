import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api, type ClassItem } from '../lib/api';
import './user-approval.css';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';
type Role = 'owner' | 'teacher' | 'student';

type Membership = {
  classId: string;
  className: string;
  groupId: string | null;
  groupName: string | null;
  kind: 'student' | 'teacher';
};

type AuditItem = {
  id: string;
  action: string;
  actorName: string | null;
  createdAt: string;
};

interface ManagedUser {
  id: string;
  schoolId: string | null;
  role: Role;
  fullName: string;
  email: string | null;
  username: string | null;
  status: Status;
  statusReason: string | null;
  emailVerified: boolean;
  note: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserDetail {
  user: ManagedUser;
  memberships: Membership[];
  audit: AuditItem[];
}

interface Draft {
  role: Role;
  classIds: string[];
  groupId: string;
  reason: string;
  fullName: string;
  email: string;
  username: string;
  password: string;
}

interface CreateDraft extends Draft { emailVerified: boolean }

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Kutilmoqda', active: 'Faol', rejected: 'Rad etilgan', suspended: 'To‘xtatilgan',
};
const ROLE_LABEL: Record<Role, string> = {
  owner: 'Administrator', teacher: 'O‘qituvchi', student: 'O‘quvchi',
};
const AUDIT_LABEL: Record<string, string> = {
  'user.created': 'Hisob yaratildi', 'user.approved': 'Hisob tasdiqlandi',
  'user.rejected': 'Ariza rad etildi', 'user.reinstated': 'Ariza navbatga qaytarildi',
  'user.active': 'Hisob faollashtirildi', 'user.suspended': 'Hisob to‘xtatildi',
  'user.role_changed': 'Rol o‘zgartirildi', 'user.profile_updated': 'Profil o‘zgartirildi',
  'user.classes_changed': 'Sinf biriktirish o‘zgartirildi', 'user.password_set': 'Parol almashtirildi',
  'user.sessions_revoked': 'Barcha sessiyalar bekor qilindi', 'user.email_verified': 'Email tasdiqlandi',
  'user.reset_link_issued': 'Parol tiklash havolasi berildi', 'user.anonymized': 'Hisob anonimlashtirildi',
};

const formatDate = (value: string | null) => value
  ? new Date(value).toLocaleString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';
const blankDraft = (user?: ManagedUser): Draft => ({
  role: user?.role ?? 'student', classIds: [], groupId: '', reason: '',
  fullName: user?.fullName ?? '', email: user?.email ?? '', username: user?.username ?? '', password: '',
});
const blankCreate = (): CreateDraft => ({ ...blankDraft(), emailVerified: true });

export function UserApprovalPanel({ classes, currentUserId }: { classes: ClassItem[]; currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [details, setDetails] = useState<Record<string, UserDetail>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [issuedCode, setIssuedCode] = useState<{ userId: string; link: string; minutes: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(blankCreate());

  const loadGroups = useCallback(async (classId: string) => {
    if (!classId || groups[classId]) return;
    try {
      const result = await api<{ groups: Array<{ id: string; name: string }> }>(`/admin/users/groups/${classId}`);
      setGroups((current) => ({ ...current, [classId]: result.groups }));
    } catch { setGroups((current) => ({ ...current, [classId]: [] })); }
  }, [groups]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (appliedSearch.trim()) params.set('q', appliedSearch.trim());
      const result = await api<{ users: ManagedUser[] }>(`/admin/users${params.size ? `?${params}` : ''}`);
      setUsers(result.users); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ro‘yxat yuklanmadi.'); }
    finally { setLoading(false); }
  }, [filter, roleFilter, appliedSearch]);

  useEffect(() => { void load(); }, [load]);

  const draftFor = (user: ManagedUser) => drafts[user.id] ?? blankDraft(user);
  const patchDraft = (id: string, patch: Partial<Draft>) => setDrafts((current) => ({
    ...current, [id]: { ...(current[id] ?? blankDraft()), ...patch },
  }));

  const loadDetail = useCallback(async (user: ManagedUser, force = false) => {
    if (!force && details[user.id]) return;
    const detail = await api<UserDetail>(`/admin/users/${user.id}/detail`);
    setDetails((current) => ({ ...current, [user.id]: detail }));
    const classIds = detail.memberships.map((item) => item.classId);
    const groupId = detail.memberships.find((item) => item.groupId)?.groupId ?? '';
    setDrafts((current) => ({
      ...current,
      [user.id]: { ...(current[user.id] ?? blankDraft(detail.user)), role: detail.user.role,
        fullName: detail.user.fullName, email: detail.user.email ?? '', username: detail.user.username ?? '', classIds, groupId },
    }));
    if (classIds[0]) void loadGroups(classIds[0]);
  }, [details, loadGroups]);

  const act = async (user: ManagedUser, action: () => Promise<unknown>, success: string, refreshDetail = true) => {
    setBusyId(user.id); setError(null); setNotice(null);
    try {
      await action(); await load();
      if (refreshDetail && expandedId === user.id) await loadDetail(user, true);
      setNotice(success);
    } catch (cause) {
      setError(cause instanceof ApiError ? [cause.message, cause.detail].filter(Boolean).join(' — ')
        : cause instanceof Error ? cause.message : 'Amal bajarilmadi.');
    } finally { setBusyId(null); }
  };

  const toggleClass = (user: ManagedUser, classId: string) => {
    const current = draftFor(user);
    const classIds = current.role === 'student' ? (current.classIds.includes(classId) ? [] : [classId])
      : current.classIds.includes(classId) ? current.classIds.filter((id) => id !== classId) : [...current.classIds, classId];
    patchDraft(user.id, { classIds, groupId: '' });
    if (current.role === 'student' && classIds[0]) void loadGroups(classIds[0]);
  };

  const submitCreate = async () => {
    setCreating(true); setError(null);
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify({
        fullName: createDraft.fullName.trim(), email: createDraft.email.trim() || null,
        username: createDraft.username.trim() || null, password: createDraft.password, role: createDraft.role,
        emailVerified: createDraft.emailVerified, classIds: createDraft.classIds, groupId: createDraft.groupId || null,
      }) });
      setCreateDraft(blankCreate()); setCreateOpen(false); setFilter('all'); setRoleFilter('all'); setAppliedSearch('');
      await load(); setNotice('Yangi foydalanuvchi yaratildi.');
    } catch (cause) { setError(cause instanceof ApiError ? [cause.message, cause.detail].filter(Boolean).join(' — ') : 'Foydalanuvchi yaratilmadi.'); }
    finally { setCreating(false); }
  };

  const pendingCount = useMemo(() => users.filter((user) => user.status === 'pending').length, [users]);

  return <section className="ua">
    <header className="ua-header">
      <div><h2>Foydalanuvchilar</h2><p className="ua-sub">Hisob, rol, sinf va xavfsizlikni bir joydan boshqaring.</p></div>
      <button className="ua-primary" onClick={() => setCreateOpen((value) => !value)}>{createOpen ? 'Bekor qilish' : '+ Foydalanuvchi yaratish'}</button>
    </header>

    {createOpen ? <div className="ua-create">
      <div className="ua-section-title"><strong>Yangi hisob</strong><span>Admin yaratgan hisob darhol faol bo‘ladi.</span></div>
      <div className="ua-form-grid">
        <label className="ua-control"><span>F.I.Sh.</span><input value={createDraft.fullName} onChange={(e) => setCreateDraft((d) => ({ ...d, fullName: e.target.value }))} /></label>
        <label className="ua-control"><span>Email</span><input type="email" value={createDraft.email} onChange={(e) => setCreateDraft((d) => ({ ...d, email: e.target.value }))} /></label>
        <label className="ua-control"><span>Username</span><input value={createDraft.username} onChange={(e) => setCreateDraft((d) => ({ ...d, username: e.target.value }))} /></label>
        <label className="ua-control"><span>Vaqtinchalik parol</span><input type="password" value={createDraft.password} onChange={(e) => setCreateDraft((d) => ({ ...d, password: e.target.value }))} /></label>
        <label className="ua-control"><span>Rol</span><select value={createDraft.role} onChange={(e) => setCreateDraft((d) => ({ ...d, role: e.target.value as Role, classIds: [], groupId: '' }))}>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label>
        <label className="ua-check"><input type="checkbox" checked={createDraft.emailVerified} onChange={(e) => setCreateDraft((d) => ({ ...d, emailVerified: e.target.checked }))} /> Email tasdiqlangan</label>
      </div>
      <ClassPicker classes={classes} role={createDraft.role} classIds={createDraft.classIds} groupId={createDraft.groupId} groups={groups}
        onToggle={(classId) => { const classIds = createDraft.role === 'student' ? [classId] : createDraft.classIds.includes(classId) ? createDraft.classIds.filter((id) => id !== classId) : [...createDraft.classIds, classId]; setCreateDraft((d) => ({ ...d, classIds, groupId: '' })); if (createDraft.role === 'student') void loadGroups(classId); }}
        onGroup={(groupId) => setCreateDraft((d) => ({ ...d, groupId }))} />
      <div className="ua-actions"><button className="ua-approve" disabled={creating || !createDraft.fullName.trim() || createDraft.password.length < 8 || (!createDraft.email.trim() && !createDraft.username.trim())} onClick={() => void submitCreate()}>{creating ? 'Yaratilmoqda…' : 'Hisob yaratish'}</button></div>
    </div> : null}

    <div className="ua-toolbar">
      <form className="ua-search" onSubmit={(e) => { e.preventDefault(); setAppliedSearch(search); }}><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism, email yoki username" /><button>Qidirish</button>{appliedSearch ? <button type="button" onClick={() => { setSearch(''); setAppliedSearch(''); }}>Tozalash</button> : null}</form>
      <label className="ua-role-filter">Rol <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}><option value="all">Barchasi</option>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label>
    </div>
    <div className="ua-filters" role="tablist">{(['pending', 'active', 'suspended', 'rejected', 'all'] as const).map((value) => <button key={value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Hammasi' : STATUS_LABEL[value]}{value === 'pending' && pendingCount ? ` · ${pendingCount}` : ''}</button>)}</div>
    {notice ? <p className="ua-notice">{notice}</p> : null}{error ? <p className="ua-error" role="alert">{error}</p> : null}

    {loading ? <p className="ua-empty">Yuklanmoqda…</p> : users.length === 0 ? <p className="ua-empty">Mos foydalanuvchi topilmadi.</p> : <ul className="ua-list">{users.map((user) => {
      const current = draftFor(user); const busy = busyId === user.id; const detail = details[user.id]; const self = user.id === currentUserId;
      return <li key={user.id} className={`ua-row ua-row--${user.status}`}>
        <div className="ua-identity"><span className="ua-avatar">{user.fullName.charAt(0).toUpperCase()}</span><div><strong>{user.fullName}</strong><span className="ua-meta">{user.username ? `@${user.username}` : 'username yo‘q'}{user.email ? ` · ${user.email}` : ''}</span><span className="ua-meta">{ROLE_LABEL[user.role]} · Oxirgi kirish: {formatDate(user.lastLoginAt)}</span></div><span className="ua-badges">{!user.emailVerified ? <span className="ua-badge ua-badge--unverified">Email tasdiqlanmagan</span> : null}<span className={`ua-badge ua-badge--${user.status}`}>{STATUS_LABEL[user.status]}</span></span></div>
        {user.note ? <p className="ua-note">“{user.note}”</p> : null}{user.statusReason ? <p className="ua-reason">{user.statusReason}</p> : null}

        {user.status === 'pending' ? <div className="ua-actions">
          <label className="ua-control"><span>Rol</span><select value={current.role} onChange={(e) => patchDraft(user.id, { role: e.target.value as Role, classIds: [], groupId: '' })}>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label>
          <label className="ua-control"><span>Sinf</span><select value={current.classIds[0] ?? ''} onChange={(e) => { const classId = e.target.value; patchDraft(user.id, { classIds: classId ? [classId] : [], groupId: '' }); if (classId) void loadGroups(classId); }}><option value="">— tanlanmagan —</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button className="ua-approve" disabled={busy} onClick={() => void act(user, () => api(`/admin/users/${user.id}/approve`, { method: 'POST', body: JSON.stringify({ role: current.role, ...(current.classIds[0] ? { classId: current.classIds[0] } : {}) }) }), 'Tasdiqlandi.', false)}>Tasdiqlash</button>
          <input className="ua-reason-input" placeholder="Rad etish sababi" value={current.reason} onChange={(e) => patchDraft(user.id, { reason: e.target.value })} /><button className="ua-reject" disabled={busy || !current.reason.trim()} onClick={() => void act(user, () => api(`/admin/users/${user.id}/reject`, { method: 'POST', body: JSON.stringify({ reason: current.reason.trim() }) }), 'Rad etildi.', false)}>Rad etish</button>
        </div> : null}

        <div className="ua-row-footer">{self ? <span className="ua-self">Bu sizning hisobingiz.</span> : <span />}
          <button className="ua-manage" onClick={() => { if (expandedId === user.id) setExpandedId(null); else { setExpandedId(user.id); void loadDetail(user); } }}>{expandedId === user.id ? 'Yopish' : 'Boshqarish'}</button></div>

        {expandedId === user.id ? <div className="ua-manager">{!detail ? <p className="ua-muted">Yuklanmoqda…</p> : <>
          <ManagerSection title="Profil" hint="Ism va login identifikatorlari."><div className="ua-form-grid"><label className="ua-control"><span>F.I.Sh.</span><input value={current.fullName} onChange={(e) => patchDraft(user.id, { fullName: e.target.value })} /></label><label className="ua-control"><span>Email</span><input type="email" value={current.email} onChange={(e) => patchDraft(user.id, { email: e.target.value })} /></label><label className="ua-control"><span>Username</span><input value={current.username} onChange={(e) => patchDraft(user.id, { username: e.target.value })} /></label></div><div className="ua-actions"><button className="ua-approve" disabled={busy} onClick={() => void act(user, () => api(`/admin/users/${user.id}/profile`, { method: 'PATCH', body: JSON.stringify({ fullName: current.fullName.trim(), email: current.email.trim() || null, username: current.username.trim() || null }) }), 'Profil saqlandi.')}>Saqlash</button>{!user.emailVerified ? <button className="ua-secondary" onClick={() => void act(user, () => api(`/admin/users/${user.id}/verify-email`, { method: 'POST', body: '{}' }), 'Email tasdiqlandi.')}>Emailni tasdiqlash</button> : null}</div></ManagerSection>

          <ManagerSection title="Rol va sinflar" hint="O‘quvchi bitta faol sinfda; staff bir nechta sinfda bo‘lishi mumkin."><div className="ua-actions"><label className="ua-control"><span>Rol</span><select disabled={self} value={current.role} onChange={(e) => patchDraft(user.id, { role: e.target.value as Role, classIds: [], groupId: '' })}>{(Object.keys(ROLE_LABEL) as Role[]).map((role) => <option key={role} value={role}>{ROLE_LABEL[role]}</option>)}</select></label><button className="ua-secondary" disabled={self || current.role === user.role} onClick={() => void act(user, () => api(`/admin/users/${user.id}/role`, { method: 'POST', body: JSON.stringify({ role: current.role }) }), 'Rol o‘zgartirildi.')}>Rolni saqlash</button></div><ClassPicker classes={classes} role={current.role} classIds={current.classIds} groupId={current.groupId} groups={groups} onToggle={(classId) => toggleClass(user, classId)} onGroup={(groupId) => patchDraft(user.id, { groupId })} /><div className="ua-current-memberships">{detail.memberships.map((item) => <span className="ua-chip" key={`${item.kind}-${item.classId}`}>{item.className}{item.groupName ? ` · ${item.groupName}` : ''}</span>)}</div><div className="ua-actions"><button className="ua-approve" onClick={() => void act(user, () => api(`/admin/users/${user.id}/classes`, { method: 'PUT', body: JSON.stringify({ classIds: current.classIds, groupId: current.groupId || null }) }), 'Sinf biriktirish saqlandi.')}>Sinflarni saqlash</button></div></ManagerSection>

          <ManagerSection title="Xavfsizlik" hint="Parol ko‘rilmaydi — faqat yangisi o‘rnatiladi. Parol almashtirilsa eski sessiyalar yopiladi."><div className="ua-actions"><label className="ua-control ua-password"><span>Yangi parol</span><input type="password" value={current.password} onChange={(e) => patchDraft(user.id, { password: e.target.value })} placeholder="Kamida 8 belgi" /></label><button className="ua-secondary" disabled={current.password.length < 8} onClick={() => void act(user, async () => { await api(`/admin/users/${user.id}/password`, { method: 'POST', body: JSON.stringify({ password: current.password }) }); patchDraft(user.id, { password: '' }); }, 'Parol almashtirildi.')}>Parolni almashtirish</button><button className="ua-secondary" disabled={self} onClick={() => void act(user, () => api(`/admin/users/${user.id}/revoke-sessions`, { method: 'POST', body: '{}' }), 'Barcha sessiyalar bekor qilindi.')}>Barcha qurilmalardan chiqarish</button>{user.status === 'active' ? <button className="ua-secondary" onClick={() => void act(user, async () => { const result = await api<{ link: string; expiresInMinutes: number }>(`/admin/users/${user.id}/reset-code`, { method: 'POST', body: '{}' }); setIssuedCode({ userId: user.id, link: result.link, minutes: result.expiresInMinutes }); }, 'Tiklash havolasi yaratildi.', false)}>Tiklash havolasi</button> : null}</div>{issuedCode?.userId === user.id ? <div className="ua-code"><p>{issuedCode.minutes} daqiqa amal qiladi, bir marta ishlaydi.</p><code>{issuedCode.link}</code></div> : null}</ManagerSection>

          <ManagerSection title="Hisob holati" hint="Suspend foydalanuvchini darhol barcha sessiyalardan chiqaradi."><div className="ua-actions">{user.status === 'active' ? <><input className="ua-reason-input" placeholder="Sabab (ixtiyoriy)" value={current.reason} onChange={(e) => patchDraft(user.id, { reason: e.target.value })} /><button className="ua-reject" disabled={self} onClick={() => void act(user, () => api(`/admin/users/${user.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'suspended', reason: current.reason.trim() || undefined }) }), 'Hisob vaqtincha yopildi.')}>Vaqtincha yopish</button></> : user.status === 'suspended' ? <button className="ua-approve" disabled={self} onClick={() => void act(user, () => api(`/admin/users/${user.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'active' }) }), 'Hisob qayta ochildi.')}>Qayta ochish</button> : user.status === 'rejected' ? <button className="ua-approve" onClick={() => void act(user, () => api(`/admin/users/${user.id}/reinstate`, { method: 'POST', body: '{}' }), 'Ariza navbatga qaytarildi.')}>Navbatga qaytarish</button> : null}</div></ManagerSection>

          <ManagerSection title="O‘chirish" hint="Hard delete faqat bog‘liq ma’lumotsiz hisobda; aks holda anonimlashtirish akademik tarixni saqlaydi." danger><div className="ua-actions"><button className="ua-danger" disabled={self} onClick={() => { if (confirm(`${user.fullName} hisobini butunlay o‘chirasizmi?`)) void act(user, () => api(`/admin/users/${user.id}`, { method: 'DELETE' }), 'Hisob o‘chirildi.', false); }}>Butunlay o‘chirish</button><button className="ua-danger" disabled={self} onClick={() => { if (confirm(`${user.fullName} shaxsiy ma’lumotlarini anonimlashtirasizmi?`)) void act(user, () => api(`/admin/users/${user.id}/anonymize`, { method: 'POST', body: '{}' }), 'Hisob anonimlashtirildi.', false); }}>Anonimlashtirish</button></div></ManagerSection>

          <ManagerSection title="Audit tarixi" hint="Ushbu hisobga admin tomonidan bajarilgan amallar.">{detail.audit.length ? <ol className="ua-audit">{detail.audit.map((item) => <li key={item.id}><span className="ua-audit-dot" /><div><strong>{AUDIT_LABEL[item.action] ?? item.action}</strong><span>{item.actorName ?? 'Tizim'} · {formatDate(item.createdAt)}</span></div></li>)}</ol> : <p className="ua-muted">Audit yozuvi yo‘q.</p>}</ManagerSection>
        </>}</div> : null}
      </li>;
    })}</ul>}
  </section>;
}

function ManagerSection({ title, hint, danger = false, children }: { title: string; hint: string; danger?: boolean; children: React.ReactNode }) {
  return <section className={`ua-manager-section${danger ? ' ua-danger-zone' : ''}`}><div className="ua-section-title"><strong>{title}</strong><span>{hint}</span></div>{children}</section>;
}

function ClassPicker({ classes, role, classIds, groupId, groups, onToggle, onGroup }: {
  classes: ClassItem[]; role: Role; classIds: string[]; groupId: string;
  groups: Record<string, Array<{ id: string; name: string }>>; onToggle: (id: string) => void; onGroup: (id: string) => void;
}) {
  return <div className="ua-class-picker"><span className="ua-label">Sinf(lar)</span><div className="ua-class-options">{classes.map((item) => <label className="ua-check" key={item.id}><input type={role === 'student' ? 'radio' : 'checkbox'} checked={classIds.includes(item.id)} onChange={() => onToggle(item.id)} /> {item.name}</label>)}{classes.length === 0 ? <span className="ua-muted">Faol sinf yo‘q.</span> : null}</div>{role === 'student' && classIds.length === 1 && (groups[classIds[0]]?.length ?? 0) > 0 ? <label className="ua-control ua-inline-control"><span>Guruh</span><select value={groupId} onChange={(e) => onGroup(e.target.value)}><option value="">— guruhsiz —</option>{groups[classIds[0]].map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}</div>;
}
