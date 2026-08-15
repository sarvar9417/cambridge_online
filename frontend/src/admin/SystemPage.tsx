import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import './system.css';

interface Setting { key: string; value: unknown; updatedAt: string }

interface SystemSummary {
  settings: Setting[];
  budget: { monthlyUsd: number | null; spentUsd: number; remainingUsd: number | null; percentUsed: number | null };
  spendByPurpose: Array<{ purpose: string; calls: number; usd: number; failed: number; unpriced: number }>;
  recentFailures: Array<{ purpose: string; model: string; error: string; createdAt: string }>;
  audit: Array<{ id: string; action: string; refTable: string | null; createdAt: string; actor: string | null }>;
}

/** What each key does, in the operator's terms rather than the column name. */
const SETTING_LABEL: Record<string, { label: string; help: string }> = {
  'ai.monthly_budget_usd': {
    label: 'Oylik AI byudjeti ($)',
    help: 'Shu chegaraga yetganda AI baholash to‘xtaydi. Ish to‘xtab qolsa shuni oshiring.',
  },
  'grading.autopilot_enabled': {
    label: 'Avtomatik baholash',
    help: 'Yoqilganda AI o‘qituvchi tasdig‘isiz ball qo‘yadi. Faqat sifat o‘lchangandan keyin yoqing.',
  },
  'grading.confidence_threshold': {
    label: 'Ishonch chegarasi',
    help: 'AI shu darajadan past ishonch bilan javob bersa, o‘qituvchiga uzatiladi.',
  },
  'grading.model': { label: 'Baholash modeli', help: 'Javoblarni baholaydigan model nomi.' },
};

const money = (value: number) => `$${value.toFixed(2)}`;
const when = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Settings, spend and the audit trail.
 *
 * All four settings were readable through the API and none was writable, which
 * made the AI budget a wall: it stops grading at its limit and only a database
 * edit could raise it.
 */
export function SystemPage() {
  const [data, setData] = useState<SystemSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const load = () => api<SystemSummary>('/admin/system')
    .then((result) => { setData(result); setError(null); })
    .catch((cause) => setError(cause instanceof Error ? cause.message : 'Yuklanmadi.'));

  useEffect(() => { void load(); }, []);

  const save = async (key: string, value: string | number | boolean) => {
    setSaving(key);
    setError(null);
    try {
      await api('/admin/system/settings', { method: 'PUT', body: JSON.stringify({ key, value }) });
      setSaved(key);
      // The confirmation clears itself; a badge that stays forever stops being
      // read as "this just happened".
      window.setTimeout(() => setSaved((current) => (current === key ? null : current)), 2500);
      await load();
      setDraft((current) => { const next = { ...current }; delete next[key]; return next; });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Saqlanmadi.');
    } finally {
      setSaving(null);
    }
  };

  if (error && !data) return <p className="sy-error" role="alert">{error}</p>;
  if (!data) return <p className="sy-loading">Yuklanmoqda…</p>;

  const { budget } = data;
  const overBudget = budget.percentUsed !== null && budget.percentUsed >= 100;
  const nearBudget = budget.percentUsed !== null && budget.percentUsed >= 80 && !overBudget;

  return (
    <div className="sy">
      <header className="sy-head">
        <h1>Tizim</h1>
        <p>Sozlamalar, AI xarajati va o‘zgarishlar tarixi.</p>
      </header>

      {error ? <p className="sy-error" role="alert">{error}</p> : null}

      <section className={`sy-card${overBudget ? ' sy-card--alert' : ''}`}>
        <h2>Oylik AI byudjeti</h2>
        {budget.monthlyUsd === null ? (
          <p className="sy-empty">Byudjet belgilanmagan.</p>
        ) : (
          <>
            <div className="sy-budget">
              <span className="sy-budget-figure">{money(budget.spentUsd)}</span>
              <span className="sy-budget-of">/ {money(budget.monthlyUsd)}</span>
              <span className={`sy-budget-pct${overBudget ? ' is-over' : nearBudget ? ' is-near' : ''}`}>
                {budget.percentUsed}%
              </span>
            </div>
            <div className="sy-bar" role="img" aria-label={`Byudjetning ${budget.percentUsed}% ishlatilgan`}>
              <i
                className={overBudget ? 'is-over' : nearBudget ? 'is-near' : ''}
                style={{ width: `${Math.min(100, budget.percentUsed ?? 0)}%` }}
              />
            </div>
            <p className="sy-note">
              {overBudget
                ? 'Byudjet tugagan — AI baholash to‘xtaydi. Davom ettirish uchun chegarani oshiring.'
                : `Qolgani ${money(budget.remainingUsd ?? 0)}. Chegaraga yetganda AI baholash to‘xtaydi.`}
            </p>
          </>
        )}
      </section>

      <section className="sy-card">
        <h2>Sozlamalar</h2>
        <div className="sy-settings">
          {data.settings.map((setting) => {
            const meta = SETTING_LABEL[setting.key];
            const isBoolean = typeof setting.value === 'boolean';
            const current = draft[setting.key] ?? String(setting.value ?? '');
            const dirty = draft[setting.key] !== undefined && draft[setting.key] !== String(setting.value ?? '');

            return (
              <div className="sy-setting" key={setting.key}>
                <div className="sy-setting-text">
                  <strong>{meta?.label ?? setting.key}</strong>
                  <small>{meta?.help ?? setting.key}</small>
                  <small className="sy-setting-key">{setting.key} · {when(setting.updatedAt)}</small>
                </div>

                {!meta ? (
                  <code className="sy-readonly">{String(setting.value)}</code>
                ) : isBoolean ? (
                  <button
                    type="button"
                    className={`sy-toggle${setting.value ? ' is-on' : ''}`}
                    aria-pressed={Boolean(setting.value)}
                    disabled={saving === setting.key}
                    onClick={() => save(setting.key, !setting.value)}
                  >
                    {setting.value ? 'Yoqilgan' : 'O‘chirilgan'}
                  </button>
                ) : (
                  <div className="sy-setting-edit">
                    <input
                      value={current}
                      inputMode={typeof setting.value === 'number' ? 'decimal' : 'text'}
                      onChange={(event) => setDraft((d) => ({ ...d, [setting.key]: event.target.value }))}
                    />
                    <button
                      type="button" disabled={!dirty || saving === setting.key}
                      onClick={() => save(
                        setting.key,
                        typeof setting.value === 'number' ? Number(current) : current,
                      )}
                    >
                      {saving === setting.key ? '…' : 'Saqlash'}
                    </button>
                    {saved === setting.key ? <span className="sy-saved" role="status">Saqlandi</span> : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sy-card">
        <h2>Bu oy AI xarajati</h2>
        {data.spendByPurpose.length === 0 ? (
          <p className="sy-empty">Bu oy AI chaqiruvi bo‘lmagan.</p>
        ) : (
          <div className="sy-table-wrap">
            <table>
              <thead>
                <tr><th>Maqsad</th><th>Chaqiruv</th><th>Xarajat</th><th>Xato</th><th>Narxsiz</th></tr>
              </thead>
              <tbody>
                {data.spendByPurpose.map((row) => (
                  <tr key={row.purpose}>
                    <td>{row.purpose}</td>
                    <td className="num">{row.calls}</td>
                    <td className="num">{money(row.usd)}</td>
                    <td className="num">{row.failed || '—'}</td>
                    <td className="num">{row.unpriced || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.spendByPurpose.some((row) => row.unpriced > 0) ? (
          <p className="sy-note">
            “Narxsiz” — modeli narx jadvalida yo‘q chaqiruvlar. Ular yuqoridagi summaga kirmaydi,
            ya’ni haqiqiy xarajat ko‘rsatilganidan yuqori.
          </p>
        ) : null}
      </section>

      {data.recentFailures.length ? (
        <section className="sy-card">
          <h2>So‘nggi AI xatolari</h2>
          <div className="sy-failures">
            {data.recentFailures.map((failure, index) => (
              <div className="sy-failure" key={`${failure.createdAt}-${index}`}>
                <div>
                  <strong>{failure.purpose}</strong>
                  <small>{when(failure.createdAt)} · {failure.model}</small>
                </div>
                <code>{failure.error}</code>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="sy-card">
        <h2>O‘zgarishlar tarixi</h2>
        {data.audit.length === 0 ? (
          <p className="sy-empty">Hali yozuv yo‘q.</p>
        ) : (
          <div className="sy-table-wrap">
            <table>
              <thead><tr><th>Vaqt</th><th>Kim</th><th>Amal</th><th>Nima</th></tr></thead>
              <tbody>
                {data.audit.map((entry) => (
                  <tr key={entry.id}>
                    <td>{when(entry.createdAt)}</td>
                    <td>{entry.actor ?? '—'}</td>
                    <td><code>{entry.action}</code></td>
                    <td>{entry.refTable ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
