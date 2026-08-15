import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import './quality.css';

interface QualitySummary {
  extraction: {
    meanConfidence: number | null;
    lowConfidence: number;
    total: number;
    crossChecks: { total: number; agreed: number; disagreed: number; agreementPct: number | null };
    disagreements: Array<{ field: string; severity: string; count: number }>;
  };
  grading: {
    evaluations: Array<{
      promptVersion: string; model: string; sampleSize: number;
      pointAgreementPct: number | null; falsePositivePct: number | null; falseNegativePct: number | null;
      computedAt: string;
    }>;
    teacherCheckedPoints: number;
  };
  promptVersions: Array<{ purpose: string; promptVersion: string; calls: number; failed: number }>;
}

const pct = (value: number | null) => (value === null ? '—' : `${value}%`);
const when = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Is the machine getting it right?
 *
 * Two questions that do not answer each other. Extraction quality is whether a
 * question was read off the paper correctly; grading quality is whether a mark
 * was awarded correctly. The second can only be measured against a teacher who
 * checked the work, so it is empty until they have, and the page says that
 * rather than showing a hopeful blank.
 */
export function QualityPage() {
  const [data, setData] = useState<QualitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  const load = () => api<QualitySummary>('/admin/quality')
    .then((result) => { setData(result); setError(null); })
    .catch((cause) => setError(cause instanceof Error ? cause.message : 'Yuklanmadi.'));

  useEffect(() => { void load(); }, []);

  const recompute = async () => {
    setRecomputing(true);
    setError(null);
    try {
      await api('/admin/grading-evaluations/recompute', { method: 'POST' });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Hisoblanmadi.');
    } finally {
      setRecomputing(false);
    }
  };

  if (error && !data) return <p className="ql-error" role="alert">{error}</p>;
  if (!data) return <p className="ql-loading">Yuklanmoqda…</p>;

  const { extraction, grading, promptVersions } = data;
  const failingPrompts = promptVersions.filter((prompt) => prompt.failed > 0);

  return (
    <div className="ql">
      <header className="ql-head">
        <h1>Sifat</h1>
        <p>
          Savol to‘g‘ri o‘qildimi va ball to‘g‘ri qo‘yildimi — ikki alohida savol, ikki alohida o‘lchov.
        </p>
      </header>

      {error ? <p className="ql-error" role="alert">{error}</p> : null}

      <section className="ql-card">
        <h2>Ekstraksiya sifati</h2>
        <p className="ql-sub">Paperdan savol o‘qib olish</p>

        <dl className="ql-metrics">
          <div className="ql-metric">
            <dt>O‘rtacha ishonch</dt>
            <dd>{extraction.meanConfidence === null ? '—' : extraction.meanConfidence.toFixed(3)}</dd>
            <small>{extraction.total} ta savol bo‘yicha</small>
          </div>
          <div className={`ql-metric${extraction.lowConfidence > 0 ? ' ql-metric--attention' : ''}`}>
            <dt>Past ishonchli</dt>
            <dd>{extraction.lowConfidence}</dd>
            <small>0.80 dan past</small>
          </div>
          <div className="ql-metric">
            <dt>Cross-check kelishuvi</dt>
            <dd>{pct(extraction.crossChecks.agreementPct)}</dd>
            <small>{extraction.crossChecks.total} ta tekshiruv</small>
          </div>
        </dl>

        {extraction.crossChecks.total === 0 ? (
          <p className="ql-note">
            Cross-check hali ishlamagan. U ikkinchi model bilan ekstraksiyani qayta tekshiradi va
            pipeline CROSSCHECK bosqichiga yetgach to‘ladi.
          </p>
        ) : extraction.disagreements.length ? (
          <>
            <h3>Nima bo‘yicha kelishmovchilik</h3>
            <div className="ql-chips">
              {extraction.disagreements.map((item) => (
                <span key={`${item.field}-${item.severity}`} className={`ql-chip ql-chip--${item.severity}`}>
                  {item.field} <b>{item.count}</b>
                </span>
              ))}
            </div>
            <p className="ql-note">
              Bitta maydon takrorlanayotgan bo‘lsa — bu prompt muammosi va tuzatsa bo‘ladi.
              Tarqoq bo‘lsa — yo‘q.
            </p>
          </>
        ) : null}
      </section>

      <section className="ql-card">
        <h2>Baholash sifati</h2>
        <p className="ql-sub">AI qo‘ygan ball o‘qituvchi qo‘yganiga qanchalik mos</p>

        {grading.evaluations.length === 0 ? (
          <div className="ql-empty-block">
            <p className="ql-empty">
              Hali o‘lchanmagan. O‘qituvchi tekshirgan {grading.teacherCheckedPoints} ta ball nuqtasi bor
              {grading.teacherCheckedPoints === 0
                ? ' — avval o‘qituvchi javoblarni baholashi kerak.'
                : ' — hisoblashni ishga tushiring.'}
            </p>
            <button type="button" disabled={recomputing || grading.teacherCheckedPoints === 0} onClick={recompute}>
              {recomputing ? 'Hisoblanmoqda…' : 'Hozir hisoblash'}
            </button>
          </div>
        ) : (
          <>
            <div className="ql-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Prompt</th><th>Model</th><th>Namuna</th>
                    <th>Kelishuv</th><th>Ortiqcha bergan</th><th>Kam bergan</th><th>Hisoblangan</th>
                  </tr>
                </thead>
                <tbody>
                  {grading.evaluations.map((row) => (
                    <tr key={`${row.promptVersion}-${row.computedAt}`}>
                      <td><code>{row.promptVersion}</code></td>
                      <td>{row.model}</td>
                      <td className="num">{row.sampleSize}</td>
                      <td className="num">{pct(row.pointAgreementPct)}</td>
                      <td className="num">{pct(row.falsePositivePct)}</td>
                      <td className="num">{pct(row.falseNegativePct)}</td>
                      <td>{when(row.computedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" disabled={recomputing} onClick={recompute}>
              {recomputing ? 'Hisoblanmoqda…' : 'Qayta hisoblash'}
            </button>
            <p className="ql-note">
              “Ortiqcha bergan” — AI ball berdi, o‘qituvchi bermadi. Bu ikkalasidan xavflirog‘i:
              o‘quvchi bilmagan narsasiga ball oladi va buni hech kim sezmaydi.
            </p>
          </>
        )}
      </section>

      <section className="ql-card">
        <h2>Prompt versiyalari</h2>
        <p className="ql-sub">Qaysi versiya nechta chaqiruvda ishlatilgan va nechtasi yiqilgan</p>
        <div className="ql-table-wrap">
          <table>
            <thead><tr><th>Maqsad</th><th>Versiya</th><th>Chaqiruv</th><th>Xato</th></tr></thead>
            <tbody>
              {promptVersions.map((row) => (
                <tr key={`${row.purpose}-${row.promptVersion}`} className={row.failed > 0 ? 'ql-row--failed' : ''}>
                  <td>{row.purpose}</td>
                  <td><code>{row.promptVersion}</code></td>
                  <td className="num">{row.calls}</td>
                  <td className="num">{row.failed || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {failingPrompts.length ? (
          <p className="ql-note">
            Xatoli chaqiruvlar hammasi bir versiyada to‘plangan bo‘lsa, muammo o‘sha promptda.
            Barcha versiyalarga tarqalgan bo‘lsa — kredit, tarmoq yoki model tomonda.
          </p>
        ) : null}
      </section>
    </div>
  );
}
