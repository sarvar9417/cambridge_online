import { useCallback, useEffect, useState } from 'react';
import {
  api,
  ApiError,
  type ClassItem,
  type Group,
  type PendingStudent,
  type RosterEntry,
} from '../../lib/api';

interface EnrolmentPanelProps {
  classes: ClassItem[];
  canSuspend: boolean;
}

/**
 * Approval queue and class roster.
 *
 * Registration is open, but a self-registered student is enrolled nowhere until
 * a teacher places them here; placement is what activates the account.
 */
export function EnrolmentPanel({ classes, canSuspend }: EnrolmentPanelProps) {
  const [pending, setPending] = useState<PendingStudent[]>([]);
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [groups, setGroups] = useState<Group[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [groupChoice, setGroupChoice] = useState<Record<string, string>>({});
  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    const response = await api<{ data: PendingStudent[] }>('/enrolment/students/pending');
    setPending(response.data);
  }, []);

  const loadClass = useCallback(async (id: string) => {
    if (!id) {
      setGroups([]);
      setRoster([]);
      return;
    }
    const [groupResponse, rosterResponse] = await Promise.all([
      api<{ data: Group[] }>(`/enrolment/classes/${id}/groups`),
      api<{ data: RosterEntry[] }>(`/enrolment/classes/${id}/roster`),
    ]);
    setGroups(groupResponse.data);
    setRoster(rosterResponse.data);
  }, []);

  const refresh = useCallback(async () => {
    setError('');
    try {
      await Promise.all([loadPending(), loadClass(classId)]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Ma’lumot yuklanmadi.');
    }
  }, [classId, loadClass, loadPending]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Amal bajarilmadi.');
    } finally {
      setBusyId(null);
    }
  };

  const assign = (studentId: string) =>
    run(studentId, () =>
      api(`/enrolment/students/${studentId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ classId, groupId: groupChoice[studentId] || null }),
      }),
    );

  const move = (studentId: string, groupId: string) =>
    run(studentId, () =>
      api(`/enrolment/students/${studentId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ classId, groupId: groupId || null }),
      }),
    );

  const setStatus = (studentId: string, status: 'active' | 'suspended') =>
    run(studentId, () =>
      api(`/enrolment/students/${studentId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    );

  const createGroup = () =>
    run('new-group', async () => {
      await api(`/enrolment/classes/${classId}/groups`, {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName.trim(), sortOrder: groups.length + 1 }),
      });
      setNewGroupName('');
    });

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>O‘quvchilarni biriktirish</h2>
        <label className="inline">
          Sinf
          <select value={classId} onChange={(event) => setClassId(event.target.value)}>
            {classes.map((klass) => (
              <option key={klass.id} value={klass.id}>
                {klass.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <p className="form-error">{error}</p>}

      <h3>
        Tasdiqlash navbati {pending.length > 0 && <span className="badge">{pending.length}</span>}
      </h3>
      {pending.length === 0 ? (
        <p className="empty">
          Navbat bo‘sh. Yangi ro‘yxatdan o‘tgan o‘quvchilar shu yerda paydo bo‘ladi.
        </p>
      ) : (
        <table className="dense">
          <thead>
            <tr>
              <th>Ism</th>
              <th>Email</th>
              <th>Ro‘yxatdan o‘tgan</th>
              <th>Guruh</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pending.map((student) => (
              <tr key={student.id}>
                <td>{student.fullName}</td>
                <td className="muted">{student.email ?? '—'}</td>
                <td className="muted">{new Date(student.createdAt).toLocaleDateString('uz-UZ')}</td>
                <td>
                  <select
                    value={groupChoice[student.id] ?? ''}
                    onChange={(event) =>
                      setGroupChoice((current) => ({
                        ...current,
                        [student.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Guruhsiz</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    disabled={!classId || busyId === student.id}
                    onClick={() => assign(student.id)}
                  >
                    Biriktirish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Guruhlar</h3>
      <div className="row">
        <input
          value={newGroupName}
          placeholder="Yangi guruh nomi"
          onChange={(event) => setNewGroupName(event.target.value)}
        />
        <button
          type="button"
          disabled={!classId || !newGroupName.trim() || busyId === 'new-group'}
          onClick={createGroup}
        >
          Guruh qo‘shish
        </button>
      </div>
      <ul className="chips">
        {groups.map((group) => (
          <li key={group.id}>
            {group.name} <span className="muted">{group.studentCount}</span>
          </li>
        ))}
      </ul>

      <h3>Sinf ro‘yxati</h3>
      {roster.length === 0 ? (
        <p className="empty">Bu sinfda hali o‘quvchi yo‘q.</p>
      ) : (
        <table className="dense">
          <thead>
            <tr>
              <th>Ism</th>
              <th>Holat</th>
              <th>Guruh</th>
              {canSuspend && <th />}
            </tr>
          </thead>
          <tbody>
            {roster.map((student) => (
              <tr key={student.id}>
                <td>{student.fullName}</td>
                <td>
                  <span className={`status status-${student.status}`}>{student.status}</span>
                </td>
                <td>
                  <select
                    value={student.groupId ?? ''}
                    disabled={busyId === student.id}
                    onChange={(event) => move(student.id, event.target.value)}
                  >
                    <option value="">Guruhsiz</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </td>
                {canSuspend && (
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busyId === student.id}
                      onClick={() =>
                        setStatus(
                          student.id,
                          student.status === 'suspended' ? 'active' : 'suspended',
                        )
                      }
                    >
                      {student.status === 'suspended' ? 'Tiklash' : 'To‘xtatish'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
