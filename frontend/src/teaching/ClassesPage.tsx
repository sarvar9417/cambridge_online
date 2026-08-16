import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, api, type ClassItem, type User } from '../lib/api';
import { navigate, useRoute } from '../lib/router';
import './classes.css';

interface ClassRecord {
  id: string; name: string; grade: number | null; level: 'AS' | 'A2';
  academic_year: string; owner_id: string; archived_at: string | null;
}

interface Roster {
  id: string; name: string; grade: number | null; level: 'AS' | 'A2';
  academicYear: string; archivedAt: string | null; ownerId: string;
  teachers: Array<{ id: string; fullName: string }>;
  students: Array<{
    id: string; fullName: string; email: string | null; joinedAt: string;
    submitted: number; assigned: number; averagePercentage: number | null;
  }>;
}

interface FreeStudent { id: string; fullName: string; email: string | null }

const nextAcademicYear = (current?: string) => {
  const start = current ? Number(current.split('/')[0]) : new Date().getFullYear();
  return `${start + 1}/${start + 2}`;
};

const thisAcademicYear = () => {
  const now = new Date();
  // The Cambridge year runs September to August, so before September the
  // current year still belongs to the one that started last autumn.
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}/${start + 1}`;
};

/**
 * Classes: the list, and one class as a place.
 *
 * A class was three columns of text with nothing to do. It is now where a
 * teacher keeps their register: who is in it, how they are going, and the
 * controls to change that.
 */
export function ClassesPage({ user, classes, onChanged }: {
  user: User;
  classes: ClassItem[];
  onChanged: () => void;
}) {
  const route = useRoute();
  const classId = route.params.get('id');
  return classId
    ? <ClassDetail user={user} classId={classId} onChanged={onChanged} />
    : <ClassList classes={classes} onChanged={onChanged} />;
}

function ClassList({ classes, onChanged }: { classes: ClassItem[]; onChanged: () => void }) {
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ class: ClassRecord }>('/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: String(data.get('name')).trim(),
          level: data.get('level'),
          academicYear: String(data.get('academicYear')).trim(),
          grade: data.get('grade') ? Number(data.get('grade')) : null,
        }),
      });
      setCreating(false);
      onChanged();
      navigate(`oqitish/sinf?id=${created.class.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError
        ? (cause.code === 'class_name_taken' ? 'Bu nomdagi sinf shu o‘quv yilida bor.' : cause.message)
        : 'Sinf yaratilmadi.');
    } finally { setBusy(false); }
  };

  return (
    <div className="cl">
      <header className="cl-head">
        <div>
          <h1>Sinflar</h1>
          <p>{classes.length ? `${classes.length} ta sinf` : 'Hali sinf yaratilmagan'}</p>
        </div>
        <button type="button" className="cl-primary" onClick={() => setCreating((open) => !open)}>
          {creating ? 'Bekor qilish' : 'Yangi sinf'}
        </button>
      </header>

      {error ? <p className="cl-error" role="alert">{error}</p> : null}

      {creating ? (
        <form className="cl-form" onSubmit={create}>
          <label>Nomi
            <input name="name" required maxLength={80} placeholder="11-A CS" autoFocus />
          </label>
          <label>Daraja
            <select name="level" defaultValue="AS">
              <option value="AS">AS</option>
              <option value="A2">A2</option>
            </select>
          </label>
          <label>Sinf raqami
            <input name="grade" type="number" min={1} max={13} placeholder="11" />
          </label>
          <label>O‘quv yili
            <input name="academicYear" required defaultValue={thisAcademicYear()} pattern="\d{4}/\d{4}" />
          </label>
          <button className="cl-primary" disabled={busy}>{busy ? 'Yaratilmoqda…' : 'Yaratish'}</button>
        </form>
      ) : null}

      {classes.length === 0 && !creating ? (
        <p className="cl-empty">
          Sinf yarating, so‘ng o‘quvchilarni biriktirasiz va unga vazifa berasiz.
        </p>
      ) : (
        <ul className="cl-list">
          {classes.map((item) => (
            <li key={item.id}>
              <button
                type="button" className="cl-row"
                onClick={() => navigate(`oqitish/sinf?id=${item.id}`)}
              >
                <div className="cl-row-text">
                  <strong>{item.name}</strong>
                  <small>{item.level} · {item.academicYear}</small>
                </div>
                <span className="cl-count">
                  <b>{item.studentCount}</b> o‘quvchi
                </span>
                <span className="cl-chevron" aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClassDetail({ user, classId, onChanged }: { user: User; classId: string; onChanged: () => void }) {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [free, setFree] = useState<FreeStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState('');
  const [rolling, setRolling] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detail, unassigned] = await Promise.all([
        api<{ roster: Roster }>(`/classes/${classId}/roster`),
        api<{ students: FreeStudent[] }>('/classes/unassigned-students'),
      ]);
      setRoster(detail.roster);
      setFree(unassigned.students);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Yuklanmadi.');
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      onChanged();
    } catch (cause) {
      setError(cause instanceof ApiError
        ? [cause.message, cause.detail].filter(Boolean).join(' — ')
        : 'Amal bajarilmadi.');
    } finally { setBusy(false); }
  };

  if (error && !roster) return <p className="cl-error" role="alert">{error}</p>;
  if (!roster) return <p className="cl-loading">Yuklanmoqda…</p>;

  const archived = Boolean(roster.archivedAt);

  return (
    <div className="cl">
      <header className="cl-detail-head">
        <button type="button" className="cl-back" onClick={() => navigate('oqitish/sinf')}>← Sinflar</button>
        <div>
          <h1>
            {roster.name}
            {archived ? <span className="cl-archived">Arxivlangan</span> : null}
          </h1>
          <p>
            {roster.level} · {roster.academicYear} · {roster.students.length} o‘quvchi
            {roster.teachers.length ? ` · ${roster.teachers.map((t) => t.fullName).join(', ')}` : ''}
          </p>
        </div>
      </header>

      {error ? <p className="cl-error" role="alert">{error}</p> : null}

      {!archived ? (
        <section className="cl-card">
          <h2>O‘quvchi qo‘shish</h2>
          {free.length === 0 ? (
            <p className="cl-empty">
              Sinfsiz o‘quvchi yo‘q. Yangi o‘quvchilar ro‘yxatdan o‘tib, tasdiqlangach shu yerda
              ko‘rinadi.
            </p>
          ) : (
            <div className="cl-add">
              <select value={adding} onChange={(event) => setAdding(event.target.value)}>
                <option value="">— o‘quvchini tanlang —</option>
                {free.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}{student.email ? ` · ${student.email}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button" className="cl-primary" disabled={!adding || busy}
                onClick={() => act(async () => {
                  await api(`/classes/${classId}/students`, {
                    method: 'POST', body: JSON.stringify({ studentId: adding }),
                  });
                  setAdding('');
                })}
              >
                Qo‘shish
              </button>
            </div>
          )}
        </section>
      ) : null}

      <section className="cl-card">
        <div className="cl-card-head">
          <h2>O‘quvchilar</h2>
          <span className="cl-muted">{roster.students.length}</span>
        </div>

        {roster.students.length === 0 ? (
          <p className="cl-empty">Sinfda hali o‘quvchi yo‘q.</p>
        ) : (
          <div className="cl-table-wrap">
            <table>
              <thead>
                <tr><th>Ism</th><th>Topshirgan</th><th>O‘rtacha</th><th></th></tr>
              </thead>
              <tbody>
                {roster.students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.fullName}</strong>
                      {student.email ? <small>{student.email}</small> : null}
                    </td>
                    <td className="num">
                      {student.assigned ? `${student.submitted}/${student.assigned}` : '—'}
                    </td>
                    <td className="num">
                      {student.averagePercentage === null ? '—' : `${student.averagePercentage}%`}
                    </td>
                    <td className="cl-row-actions">
                      {!archived ? (
                        <button
                          type="button" className="cl-danger" disabled={busy}
                          title="Sinfdan chiqarish — o‘tgan ishi joyida qoladi"
                          onClick={() => {
                            if (!confirm(`${student.fullName} sinfdan chiqarilsinmi?`)) return;
                            void act(() => api(`/classes/${classId}/students/${student.id}`, { method: 'DELETE' }));
                          }}
                        >
                          Chiqarish
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="cl-card">
        <h2>Sinfni boshqarish</h2>
        <div className="cl-manage">
          {archived ? (
            <button
              type="button" disabled={busy}
              onClick={() => act(() => api(`/classes/${classId}/unarchive`, { method: 'POST' }))}
            >
              Arxivdan chiqarish
            </button>
          ) : (
            <>
              <button
                type="button" disabled={busy || rolling}
                onClick={() => setRolling(true)}
              >
                Keyingi o‘quv yiliga ko‘chirish
              </button>
              <button
                type="button" className="cl-danger" disabled={busy}
                title="O‘chirilmaydi — arxivlanadi, o‘tgan yil natijalari saqlanadi"
                onClick={() => {
                  if (!confirm(`${roster.name} arxivlansinmi?`)) return;
                  void act(() => api(`/classes/${classId}/archive`, { method: 'POST' }));
                }}
              >
                Arxivlash
              </button>
            </>
          )}
        </div>

        {rolling ? (
          <form
            className="cl-rollover"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void act(async () => {
                const created = await api<{ class: ClassRecord }>(`/classes/${classId}/rollover`, {
                  method: 'POST',
                  body: JSON.stringify({
                    academicYear: String(data.get('academicYear')).trim(),
                    name: String(data.get('name')).trim() || undefined,
                    grade: data.get('grade') ? Number(data.get('grade')) : undefined,
                  }),
                });
                setRolling(false);
                navigate(`oqitish/sinf?id=${created.class.id}`);
              });
            }}
          >
            <p className="cl-note">
              Yangi sinf yaratiladi, hamma o‘quvchi va o‘qituvchi unga ko‘chiriladi, bu sinf esa
              arxivlanadi — o‘tgan yil vazifalari va baholari o‘z joyida qoladi.
            </p>
            <label>Yangi nomi
              <input name="name" defaultValue={roster.name} maxLength={80} />
            </label>
            <label>Sinf raqami
              <input name="grade" type="number" min={1} max={13} defaultValue={roster.grade ?? ''} />
            </label>
            <label>O‘quv yili
              <input name="academicYear" required defaultValue={nextAcademicYear(roster.academicYear)} pattern="\d{4}/\d{4}" />
            </label>
            <div className="cl-manage">
              <button className="cl-primary" disabled={busy}>Ko‘chirish</button>
              <button type="button" onClick={() => setRolling(false)}>Bekor qilish</button>
            </div>
          </form>
        ) : null}

        {user.role === 'owner' ? (
          <p className="cl-note">
            Egasi: {roster.teachers.find((t) => t.id === roster.ownerId)?.fullName ?? '—'}.
            Sinf egasini o‘qituvchilar ro‘yxatidan olib bo‘lmaydi.
          </p>
        ) : null}
      </section>
    </div>
  );
}
