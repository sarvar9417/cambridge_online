import { useMemo, type ReactNode } from 'react';
import type { CommandWordProgress, Flashcard, MasteryItem } from '../lib/api';
import { useRoute } from '../lib/router';
import { StudentLessons } from './StudentLessons';
import { StudentLessonProgress } from './StudentLessonProgress';
import { StudentMasteryMap } from './StudentMasteryMap';
import './student-learning.css';

export interface StudentLearningProps {
  mastery: MasteryItem[];
  commandWords: CommandWordProgress[];
  flashcards: Flashcard[];
  cardRevealed: boolean;
  practicing: string | null;
  onReveal: () => void;
  onGrade: (grade: number) => void;
  onPractice: (item: MasteryItem) => void;
  games: ReactNode;
}

const WEAK = 0.6;
export function bandOf(score: number) { return score >= 0.8 ? 'strong' : score >= WEAK ? 'fair' : 'weak'; }

export function StudentLearning({
  mastery, commandWords, flashcards, cardRevealed, practicing,
  onReveal, onGrade, onPractice, games,
}: StudentLearningProps) {
  const route = useRoute();
  const attempted = useMemo(() => mastery.filter((item) => item.attempts > 0).sort((a,b)=>a.score-b.score), [mastery]);
  const readyTopics = mastery.filter((item) => item.practiceReady).length;
  const weakest = attempted[0];
  const card = flashcards[0];

  if (route.page === 'darslar') return <>
    <StudentLessonProgress />
    <StudentLessons />
  </>;

  const headline = card
    ? `${flashcards.length} ta kartochka takrorlashni kutmoqda.`
    : weakest && weakest.score < WEAK
      ? `Eng ko‘p ball ${weakest.code} mavzusida yo‘qotilyapti.`
      : attempted.length
        ? 'Kuchsiz joylarni syllabus xaritasidan kuzatib boring.'
        : 'Natijalar chiqqach qaysi subtopicni mashq qilish kerakligi ko‘rinadi.';

  return <div className="sl">
    <header className="sl-hero">
      <p className="sl-eyebrow">Mashq va takrorlash</p>
      <h1>{headline}</h1>
      {mastery.length ? <div className="sl-practice-summary" aria-label={`${readyTopics} ta subtopicda mashq tayyor`}>
        <span className="sl-practice-summary-dot" aria-hidden="true" />
        <strong>{readyTopics}/{mastery.length}</strong>
        <span>subtopicda 5 ta to‘liq source-backed Cambridge savoli tayyor</span>
      </div> : null}
    </header>

    {card ? <section className="sl-card sl-flash">
      <div className="sl-card-head"><h2>Kartochkalar</h2><span className="sl-counter">{flashcards.length} ta qoldi</span></div>
      <div className="sl-flash-face">
        <p className="sl-flash-front">{card.front_md}</p>
        {cardRevealed ? <p className="sl-flash-back">{card.back_md}</p> : null}
        {!cardRevealed && card.hint_md ? <p className="sl-flash-hint">{card.hint_md}</p> : null}
      </div>
      {cardRevealed ? <div className="sl-grades">
        <button type="button" className="sl-grade sl-grade--hard" onClick={()=>onGrade(1)}>Qiyin<small>tez orada qaytadi</small></button>
        <button type="button" className="sl-grade" onClick={()=>onGrade(3)}>O‘rtacha<small>bir necha kundan keyin</small></button>
        <button type="button" className="sl-grade sl-grade--easy" onClick={()=>onGrade(5)}>Oson<small>ancha keyin</small></button>
      </div> : <button type="button" className="sl-primary" onClick={onReveal}>Javobni ko‘rsatish</button>}
    </section> : <section className="sl-card"><h2>Kartochkalar</h2><p className="sl-empty">Bugunga takrorlanadigan kartochka qolmadi.</p></section>}

    <section className="sl-card">
      <div className="sl-card-head"><div><h2>Cambridge syllabus bilim xaritasi</h2><p className="sl-card-subtitle">Topic → subtopic → mastery. Mashq faqat 5 ta to‘liq source-backed savol bo‘lsa ochiladi.</p></div><span className="sl-counter">{mastery.length} subtopic</span></div>
      <StudentMasteryMap mastery={mastery} practicing={practicing} onPractice={onPractice} />
    </section>

    <section className="sl-card">
      <div className="sl-card-head"><h2>Imtihon ko‘nikmalari</h2><span className="sl-counter">{commandWords.length} command word</span></div>
      {commandWords.length === 0 ? <p className="sl-empty">Baholar chiqarilgach command word tahlili paydo bo‘ladi.</p> : <>
        <ul className="sl-words">{[...commandWords].sort((a,b)=>a.percentage-b.percentage).map((word)=><li key={word.commandWord}>
          <span className="sl-word">{word.commandWord}</span><div className="sl-topic-track" aria-hidden="true"><i style={{width:`${Math.round(word.percentage)}%`}} /></div><span className="sl-topic-score">{Math.round(word.percentage)}%</span><small>{word.sampleSize} javob</small>
        </li>)}</ul>
        <p className="sl-note">Command word natijasi mavzu bilimidan alohida signal: masalan, “Describe” va “Explain” turli dalil darajasini talab qiladi.</p>
      </>}
    </section>
    {games}
  </div>;
}
