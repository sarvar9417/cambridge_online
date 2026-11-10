import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ReportBase {
  classId: string;
  className: string;
  courseCode: string;
  studentCount: number;
  periodDays: 30;
  minimumParticipants: number;
  assessed: false;
  privacy: 'aggregate_only';
}
type PracticeReport = ReportBase & (
  | { status: 'insufficient_data' }
  | {
      status: 'ready';
      participatingStudents: number;
      totalRounds: number;
      scoredRounds: number;
      reportedCorrect: number;
      reportedIncorrect: number;
      modes: Array<{ mode: string; rounds: number }>;
      difficultTerms: Array<{ term: string; chapterNo: number; learners: number; correct: number; incorrect: number }>;
    }
);

export function ClassPracticeReport({ classId }: { classId: string }) {
  const [report, setReport] = useState<PracticeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void api<{ data: PracticeReport }>('/classes/' + classId + '/practice-report')
      .then(({ data }) => { if (active) setReport(data); })
      .catch(() => {
        if (active) {
          setReport(null);
          setError('Mashq hisoboti yuklanmadi. Server va ma’lumotlar bazasi migratsiyasini tekshiring.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classId, version]);

  return <section className="cl-card cl-practice-report" aria-label="Sinfning mashq hisoboti">
    <div className="cl-card-head">
      <h2>Interactive Games · sinf hisoboti</h2>
      <button type="button" onClick={() => setVersion((value) => value + 1)} disabled={loading}>Yangilash</button>
    </div>
    <p className="cl-note">Oxirgi 30 kun. Faqat sinf bo‘yicha umumiy, o‘quvchi shaxsini ochmaydigan ma’lumotlar.
      Bu mustaqil mashq signallari, rasmiy baho yoki o‘zlashtirish darajasi emas.</p>
    {loading && <p role="status">Hisobot yuklanmoqda…</p>}
    {error && <p className="cl-error" role="alert">{error}</p>}
    {!loading && report?.status === 'insufficient_data' && <p className="cl-empty">
      Hisobot maxfiylik uchun hozircha yashirilgan. Kamida {report.minimumParticipants} nafar turli
      o‘quvchi oxirgi 30 kunda mashq bajargach, sinfning umumiy ko‘rsatkichlari ochiladi.
      Sinfda hozir {report.studentCount} nafar o‘quvchi bor.
    </p>}
    {!loading && report?.status === 'ready' && <>
      <div className="cl-report-stats">
        <div><strong>{report.participatingStudents}</strong><span>Mashq qilgan o‘quvchilar</span></div>
        <div><strong>{report.totalRounds}</strong><span>Saqlangan mashq raundlari</span></div>
        <div><strong>{report.reportedCorrect}</strong><span>To‘g‘ri deb qayd etilgan birinchi javoblar</span></div>
        <div><strong>{report.reportedIncorrect}</strong><span>Xato deb qayd etilgan birinchi javoblar</span></div>
      </div>
      <p className="cl-note">Javoblar faqat avtomatik tekshiriladigan o‘yin turlaridan hisoblandi;
        Flash Cards’dagi o‘zini baholash bu ko‘rsatkichlarga kiritilmagan.</p>
      <h3>O‘yin turlari bo‘yicha faollik</h3>
      <ul className="cl-report-modes">{report.modes.map((item) =>
        <li key={item.mode}><span>{item.mode}</span><strong>{item.rounds} raund</strong></li>)}</ul>
      <h3>Ko‘proq takrorlash talab qilishi mumkin bo‘lgan atamalar</h3>
      {report.difficultTerms.length ? <div className="cl-table-wrap">
        <table>
          <thead><tr><th>Atama</th><th>Chapter</th><th>O‘quvchilar</th><th>Xato urinishlar</th></tr></thead>
          <tbody>{report.difficultTerms.map((item) => <tr key={item.chapterNo + ':' + item.term}>
            <td>{item.term}</td><td>{item.chapterNo}</td><td>{item.learners}</td><td>{item.incorrect}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="cl-empty">Kamida 5 nafar turli o‘quvchining bir xil atama bo‘yicha javobi mavjud emas.</p>}
    </>}
  </section>;
}
