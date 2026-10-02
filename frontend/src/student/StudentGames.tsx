import { useState } from 'react';
import type { ContentGames } from '../lib/api';

type GameMode = 'term' | 'sequence' | 'gap';

export function StudentGames({ games }: { games: ContentGames }) {
  // A fresh dataset starts a fresh game, including after an account switch.
  return <Games key={JSON.stringify(games)} games={games} />;
}

function Games({ games }: { games: ContentGames }) {
  const available = { term: games.termMatch.length > 0, sequence: games.sequence.length > 1, gap: games.spotTheGap.length > 0 };
  const [mode, setMode] = useState<GameMode>(available.term ? 'term' : available.sequence ? 'sequence' : 'gap');
  const [termAnswers, setTermAnswers] = useState<Record<string, string>>({});
  const [sequence, setSequence] = useState(() => [...games.sequence].reverse());
  const [gapAnswer, setGapAnswer] = useState('');
  const [result, setResult] = useState('');
  if (!Object.values(available).some(Boolean)) return null;

  const move = (index: number, offset: number) => setSequence(current => {
    const next = [...current];
    [next[index], next[index + offset]] = [next[index + offset]!, next[index]!];
    return next;
  });
  return <section id="student-games">
    <div className="section-title"><h2>Mashq o‘yinlari</h2><div className="segmented game-tabs" aria-label="O‘yin turi">
      {([['term', 'Term match'], ['sequence', 'Sequence'], ['gap', 'Spot the gap']] as const).map(([value, label]) =>
        <button key={value} type="button" className={mode === value ? 'active' : ''} disabled={!available[value]}
          title={available[value] ? undefined : 'Bu o‘yin uchun material hali mavjud emas'}
          onClick={() => { setMode(value); setResult(''); }}>{label}</button>)}
    </div></div>
    <div className="learning-game">
      {mode === 'term' && <>{games.termMatch.map(item => <label key={item.id}><strong>{item.term}</strong>
        <select value={termAnswers[item.id] ?? ''} onChange={event => setTermAnswers(current => ({ ...current, [item.id]: event.target.value }))}>
          <option value="">Ta’rifni tanlang</option>{games.termMatch.map(option => <option value={option.id} key={option.id}>{option.definition}</option>)}
        </select></label>)}<button type="button" onClick={() => setResult(`${games.termMatch.filter(item => termAnswers[item.id] === item.id).length}/${games.termMatch.length} to‘g‘ri`)}>Tekshirish</button></>}
      {mode === 'sequence' && <>{sequence.map((item, index) => <div className="sequence-item" key={item.id}>
        <b>{index + 1}</b><span>{item.code} {item.text}</span>
        <button type="button" title="Yuqoriga" disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
        <button type="button" title="Pastga" disabled={index === sequence.length - 1} onClick={() => move(index, 1)}>↓</button>
      </div>)}<button type="button" onClick={() => setResult(sequence.every((item, index) => item.id === games.sequence[index]?.id) ? 'To‘g‘ri tartib' : 'Tartibni yana tekshiring')}>Tekshirish</button></>}
      {mode === 'gap' && games.spotTheGap[0] && <><p className="gap-prompt">{games.spotTheGap[0].prompt}</p>
        <label>Atama<input value={gapAnswer} onChange={event => setGapAnswer(event.target.value)} /></label>
        <button type="button" onClick={() => setResult(gapAnswer.trim().toLowerCase() === games.spotTheGap[0]!.answer.toLowerCase() ? 'To‘g‘ri' : `Javob: ${games.spotTheGap[0]!.answer}`)}>Tekshirish</button></>}
      {result && <strong className="game-result" aria-live="polite">{result}</strong>}
    </div>
  </section>;
}
