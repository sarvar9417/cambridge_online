import type { MasteryItem } from '../lib/api';
import './student-mastery-map.css';

export type MasteryTopic = {
  key:string;
  title:string;
  score:number;
  attempts:number;
  marksEarned:number;
  marksPossible:number;
  items:MasteryItem[];
};

export function buildMasteryTopics(mastery: MasteryItem[]): MasteryTopic[] {
  const groups = new Map<string, MasteryItem[]>();
  for (const item of mastery) {
    const key = item.code.split('.')[0] || item.code;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([key, items]) => {
    const marksEarned = items.reduce((sum, item) => sum + item.marksEarned, 0);
    const marksPossible = items.reduce((sum, item) => sum + item.marksPossible, 0);
    const attempted = items.filter((item) => item.attempts > 0);
    const score = marksPossible > 0
      ? marksEarned / marksPossible
      : attempted.length ? attempted.reduce((sum, item) => sum + item.score, 0) / attempted.length : 0;
    return {
      key,
      title:`Topic ${key}`,
      score,
      attempts:items.reduce((sum, item) => sum + item.attempts, 0),
      marksEarned,
      marksPossible,
      items:[...items].sort((a, b) => a.code.localeCompare(b.code, undefined, {numeric:true})),
    };
  }).sort((a, b) => a.key.localeCompare(b.key, undefined, {numeric:true}));
}

const band = (score:number) => score >= .8 ? 'strong' : score >= .6 ? 'fair' : 'weak';

export function StudentMasteryMap({mastery,practicing,onPractice}:{mastery:MasteryItem[];practicing:string|null;onPractice:(item:MasteryItem)=>void}) {
  const topics = buildMasteryTopics(mastery);
  if (!topics.length) return <p className="smm-empty">Natijalar chiqqach Cambridge syllabus bilim xaritasi shu yerda paydo bo‘ladi.</p>;

  return <div className="smm">
    {topics.map((topic) => <details className={`smm-topic smm-topic--${band(topic.score)}`} key={topic.key} open={topic.score < .8 && topic.attempts > 0}>
      <summary>
        <div><span>{topic.title}</span><strong>{topic.items.length} subtopic</strong></div>
        <div className="smm-topic-track" aria-hidden="true"><i style={{width:`${Math.round(topic.score * 100)}%`}} /></div>
        <b>{topic.attempts ? `${Math.round(topic.score * 100)}%` : '—'}</b>
      </summary>
      <ul>{topic.items.map((item) => {
        const ready = Boolean(item.practiceReady);
        return <li key={item.subtopic_id}>
          <div className="smm-copy"><strong>{item.code} {item.title}</strong><small>{item.attempts ? `${item.marksEarned}/${item.marksPossible} ball · ${item.attempts} urinish` : 'Hali urinilmagan'}</small></div>
          <div className="smm-sub-track" aria-hidden="true"><i style={{width:`${Math.round(item.score * 100)}%`}} /></div>
          <span>{item.attempts ? `${Math.round(item.score * 100)}%` : '—'}</span>
          <button type="button" disabled={!ready || practicing===item.subtopic_id} onClick={()=>onPractice(item)} title={ready?'5 ta source-backed Cambridge savoli bilan mashq':'Bu subtopic uchun 5 ta to‘liq source-backed savol hali tayyor emas'}>
            {practicing===item.subtopic_id?'Tayyorlanmoqda…':ready?'Mashq':'Pool kutilmoqda'}
          </button>
        </li>;
      })}</ul>
    </details>)}
  </div>;
}
