import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';
import './overview.css';

export interface Overview {
  waiting: { pendingUsers: number; reviewQueue: number; openAppeals: number };
  corpus: {
    ingestedPapers: number; totalPapers: number;
    questions: number; markSchemes: number; markPoints: number;
    recent: Array<{ label: string; questions: number; marks: number; status: string }>;
  };
  syllabus: { topics: number; subtopics: number; objectives: number; coverage: Array<{ band: string; percent: number; subtopics: number }> };
  spend: { monthUsd: number; calls: number; unpriced: number };
  blockers: Array<{ code: string; title: string; detail: string }>;
}

const nf = new Intl.NumberFormat('uz-UZ');

/**
 * The page an owner opens first. It answers one question: what needs me today.
 *
 * Order is deliberate. A blocker outranks every figure, because a stopped
 * pipeline makes the rest of the numbers stale. Then the four counts, then the
 * two things that take a decision.
 *
 * No green anywhere: theme.css reserves green and red for "mark point awarded /
 * not awarded" so a teacher's eye learns one meaning per colour. Amber carries
 * "needs you" and also a border stripe, so it does not depend on hue alone.
 */
export function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Overview>('/admin/overview')
      .then((result) => { if (!cancelled) { setData(result); setError(null); } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Yuklanmadi.'); });
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="ov-error" role="alert">{error}</p>;
  if (!data) {
    // A layout-shaped skeleton, so the first paint already teaches where the
    // numbers will sit instead of replacing the dashboard with a text line.
    return (
      <div className="ov" aria-busy="true" aria-label="Yuklanmoqda">
        <header className="ov-head"><h1>Umumiy holat</h1></header>
        <div className="ov-metrics" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => <div className="ov-metric ov-skel" key={index} />)}
        </div>
        <div className="ov-cols" aria-hidden="true">
          <section className="ov-card ov-skel ov-skel--tall" />
          <div className="ov-stack">
            <section className="ov-card ov-skel" />
            <section className="ov-card ov-skel" />
          </div>
        </div>
      </div>
    );
  }

  const { waiting, corpus, syllabus, spend, blockers } = data;
  const fill = corpus.totalPapers ? Math.round((corpus.ingestedPapers / corpus.totalPapers) * 100) : 0;
  const today = new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', weekday: 'long' });

  return (
    <div className="ov">
      <header className="ov-head">
        <h1>Umumiy holat</h1>
        <time dateTime={new Date().toISOString().slice(0, 10)}>{today}</time>
      </header>

      {blockers.map((blocker) => (
        <section className="ov-blocker" key={blocker.code} role="status">
          <span className="ov-blocker-mark" aria-hidden="true">▲</span>
          <div>
            <strong>{blocker.title}</strong>
            <p>{blocker.detail}</p>
          </div>
        </section>
      ))}

      <dl className="ov-metrics">
        <Metric
          label="Sizni kutmoqda" value={nf.format(waiting.pendingUsers)}
          note="ro‘yxatdan o‘tish arizasi" attention={waiting.pendingUsers > 0}
        />
        <Metric
          label="Korpus to‘ldi" value={`${fill}%`}
          note={`${nf.format(corpus.totalPapers)} paperdan ${nf.format(corpus.ingestedPapers)} tasi`}
        />
        <Metric
          label="Savollar" value={nf.format(corpus.questions)}
          note={`${nf.format(corpus.markSchemes)} mark scheme · ${nf.format(corpus.markPoints)} ball`}
        />
        <Metric
          label="Bu oy sarf" value={`$${spend.monthUsd.toFixed(2)}`}
          note={`${nf.format(spend.calls)} ta AI chaqiruvi`}
        />
      </dl>

      <div className="ov-cols">
        <section className="ov-card">
          <h2>Korpus to‘ldirish</h2>
          <p className="ov-card-sub">9618 question paperlari va mark schemelari</p>

          <div
            className="ov-bar" role="img"
            aria-label={`${corpus.totalPapers} paperdan ${corpus.ingestedPapers} tasi kiritilgan`}
          >
            <i className="done" style={{ width: `${fill}%` }} />
            <i className="queued" style={{ width: `${100 - fill}%` }} />
          </div>
          <div className="ov-legend">
            <span><i className="ov-swatch ov-swatch--done" /> Kiritilgan · {nf.format(corpus.ingestedPapers)}</span>
            <span><i className="ov-swatch ov-swatch--queued" /> Navbatda · {nf.format(Math.max(0, corpus.totalPapers - corpus.ingestedPapers))}</span>
          </div>

          {corpus.recent.length ? (
            <div className="ov-table-wrap">
              <table>
                <thead>
                  <tr><th>Paper</th><th>Savol</th><th>Ball</th><th>Holat</th></tr>
                </thead>
                <tbody>
                  {corpus.recent.map((paper) => (
                    <tr key={paper.label}>
                      <td>{paper.label}</td>
                      <td className="num">{nf.format(paper.questions)}</td>
                      <td className="num">{nf.format(paper.marks)}</td>
                      <td>{paper.status === 'needs_review' ? 'Tekshirilmagan' : 'Tekshirilgan'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ov-note">Hali birorta paper kiritilmagan.</p>
          )}
        </section>

        <div className="ov-stack">
          <section className="ov-card">
            <h2>Sizni kutmoqda</h2>
            <div className="ov-queue">
              <QueueRow
                title={waiting.pendingUsers ? `${nf.format(waiting.pendingUsers)} ta ro‘yxatdan o‘tish arizasi` : 'Ariza yo‘q'}
                note="Rol va sinf berilishi kerak"
                to="boshqaruv/odamlar"
              />
              <QueueRow
                title={waiting.reviewQueue ? `${nf.format(waiting.reviewQueue)} ta savol tekshirilmagan` : 'Tekshirish navbati bo‘sh'}
                note="Ingestion findinglari"
                to="boshqaruv/korpus"
              />
              <QueueRow
                title={waiting.openAppeals ? `${nf.format(waiting.openAppeals)} ta apellyatsiya` : 'Apellyatsiya yo‘q'}
                note="O‘quvchi shikoyatlari"
                to="oqitish/tekshirish"
              />
            </div>
            <p className="ov-note">
              Bo‘sh navbat ham ma’lumot: “hech narsa kutmayapti” degani, “yuklanmadi” degani emas.
            </p>
          </section>

          <section className="ov-card">
            <h2>Sillabus qamrovi</h2>
            <p className="ov-card-sub">
              {nf.format(syllabus.topics)} mavzu · {nf.format(syllabus.subtopics)} kichik mavzu
              · {nf.format(syllabus.objectives)} learning objective
            </p>
            <div className="ov-coverage">
              {syllabus.coverage.map((band) => (
                <div
                  className="ov-cov-row" key={band.band}
                  title={`${band.band}-mavzular: ${band.subtopics} ta kichik mavzudan ${Math.round((band.percent / 100) * band.subtopics)} tasida savol bor`}
                >
                  <span>{band.band}</span>
                  <div className="ov-cov-track"><i style={{ width: `${band.percent}%` }} /></div>
                  <span>{band.percent}%</span>
                </div>
              ))}
            </div>
            <p className="ov-note">
              Qaysi mavzuda savol yetishmayotganini ko‘rsatadi — keyingi qaysi paperni kiritish
              kerakligini shu hal qiladi.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, note, attention }: {
  label: string; value: string; note: string; attention?: boolean;
}) {
  return (
    <div className={`ov-metric${attention ? ' ov-metric--attention' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      <small>{note}</small>
    </div>
  );
}

function QueueRow({ title, note, to }: { title: string; note: string; to: string }) {
  return (
    <div className="ov-queue-row">
      <div>
        <b>{title}</b>
        <small>{note}</small>
      </div>
      <a href={`#${to}`} onClick={(event) => { event.preventDefault(); navigate(to); }}>Ochish →</a>
    </div>
  );
}
