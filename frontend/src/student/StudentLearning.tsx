import { useMemo, useState, type ReactNode } from 'react';
import type { CommandWordProgress, Flashcard, MasteryItem } from '../lib/api';
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
  /** The games, still owned by App: self-contained state that would gain nothing from moving. */
  games: ReactNode;
}

const WEAK_LIMIT = 6;

/** Below this a subtopic is worth practising rather than revising. */
const WEAK = 0.6;

export function bandOf(score: number) {
  return score >= 0.8 ? 'strong' : score >= WEAK ? 'fair' : 'weak';
}

/**
 * Where a student works on what they are weak at.
 *
 * The four blocks used to stack in the order they were written -- knowledge map,
 * command words, one flashcard, games -- with nothing saying which to do. It
 * now opens with the single next action, and the knowledge map lets any
 * subtopic be practised rather than only the first in the list, which is what it
 * did before and which left a student unable to practise their third weakest
 * topic.
 */
export function StudentLearning({
  mastery, commandWords, flashcards, cardRevealed, practicing,
  onReveal, onGrade, onPractice, games,
}: StudentLearningProps) {
  const [showAll, setShowAll] = useState(false);

  const attempted = useMemo(
    () => mastery.filter((item) => item.attempts > 0).sort((a, b) => a.score - b.score),
    [mastery],
  );
  const untouched = useMemo(() => mastery.filter((item) => item.attempts === 0), [mastery]);
  const shown = showAll ? [...attempted, ...untouched] : attempted.slice(0, WEAK_LIMIT);

  const card = flashcards[0];
  const weakest = attempted[0];

  const headline = card
    ? `${flashcards.length} ta kartochka takrorlashni kutmoqda.`
    : weakest && weakest.score < WEAK
      ? `Eng ko‘p ball ${weakest.code} mavzusida yo‘qotilyapti.`
      : attempted.length
        ? 'Hammasi joyida — kuchsiz mavzu ko‘rinmayapti.'
        : 'Bir nechta vazifa topshirgach, bu yerda nimani mashq qilish kerakligi ko‘rinadi.';

  return (
    <div className="sl">
      <header className="sl-hero">
        <p className="sl-eyebrow">O‘rganish</p>
        <h1>{headline}</h1>
      </header>

      {card ? (
        <section className="sl-card sl-flash">
          <div className="sl-card-head">
            <h2>Kartochkalar</h2>
            <span className="sl-counter">{flashcards.length} ta qoldi</span>
          </div>

          <div className="sl-flash-face">
            <p className="sl-flash-front">{card.front_md}</p>
            {cardRevealed ? <p className="sl-flash-back">{card.back_md}</p> : null}
            {!cardRevealed && card.hint_md ? <p className="sl-flash-hint">{card.hint_md}</p> : null}
          </div>

          {cardRevealed ? (
            <div className="sl-grades">
              {/* The three answers a person can honestly give about a card they
                  just saw the back of. The interval follows from this. */}
              <button type="button" className="sl-grade sl-grade--hard" onClick={() => onGrade(1)}>
                Qiyin<small>tez orada qaytadi</small>
              </button>
              <button type="button" className="sl-grade" onClick={() => onGrade(3)}>
                O‘rtacha<small>bir necha kundan keyin</small>
              </button>
              <button type="button" className="sl-grade sl-grade--easy" onClick={() => onGrade(5)}>
                Oson<small>ancha keyin</small>
              </button>
            </div>
          ) : (
            <button type="button" className="sl-primary" onClick={onReveal}>Javobni ko‘rsatish</button>
          )}
        </section>
      ) : (
        <section className="sl-card">
          <h2>Kartochkalar</h2>
          <p className="sl-empty">Bugunga takrorlanadigan kartochka qolmadi.</p>
        </section>
      )}

      <section className="sl-card">
        <div className="sl-card-head">
          <h2>Bilim xaritasi</h2>
          <span className="sl-counter">{mastery.length} mavzu</span>
        </div>

        {mastery.length === 0 ? (
          <p className="sl-empty">Natijalar chiqqach bilim xaritasi paydo bo‘ladi.</p>
        ) : (
          <>
            <ul className="sl-mastery">
              {shown.map((item) => {
                const band = bandOf(item.score);
                return (
                  <li key={item.subtopic_id} className={`sl-topic sl-topic--${band}`}>
                    <div className="sl-topic-text">
                      <strong>{item.code} {item.title}</strong>
                      <small>
                        {item.attempts
                          ? `${item.marksEarned}/${item.marksPossible} ball · ${item.attempts} urinish`
                          : 'Hali urinilmagan'}
                      </small>
                    </div>
                    <div className="sl-topic-track" aria-hidden="true">
                      <i style={{ width: `${Math.round(item.score * 100)}%` }} />
                    </div>
                    <span className="sl-topic-score">{Math.round(item.score * 100)}%</span>
                    {/* Practice was offered on the first row only, so a student
                        could not work on their third weakest topic. */}
                    <button
                      type="button" disabled={practicing === item.subtopic_id}
                      onClick={() => onPractice(item)}
                    >
                      {practicing === item.subtopic_id ? '…' : 'Mashq'}
                    </button>
                  </li>
                );
              })}
            </ul>

            {attempted.length + untouched.length > shown.length || showAll ? (
              <button type="button" className="sl-link" onClick={() => setShowAll((value) => !value)}>
                {showAll
                  ? 'Faqat kuchsizlarini ko‘rsatish'
                  : `Hammasini ko‘rsatish (${attempted.length + untouched.length})`}
              </button>
            ) : null}
          </>
        )}
      </section>

      <section className="sl-card">
        <div className="sl-card-head">
          <h2>Imtihon ko‘nikmalari</h2>
          <span className="sl-counter">{commandWords.length} command word</span>
        </div>
        {commandWords.length === 0 ? (
          <p className="sl-empty">Baholar chiqarilgach command word tahlili paydo bo‘ladi.</p>
        ) : (
          <>
            <ul className="sl-words">
              {[...commandWords].sort((a, b) => a.percentage - b.percentage).map((word) => (
                <li key={word.commandWord}>
                  <span className="sl-word">{word.commandWord}</span>
                  <div className="sl-topic-track" aria-hidden="true">
                    <i style={{ width: `${Math.round(word.percentage)}%` }} />
                  </div>
                  <span className="sl-topic-score">{Math.round(word.percentage)}%</span>
                  <small>{word.sampleSize} javob</small>
                </li>
              ))}
            </ul>
            <p className="sl-note">
              Command word — savol nima so‘rayotgani. “Describe” va “Explain” uchun ball
              boshqacha beriladi, shuning uchun pastdagilar mavzuni bilmaslikdan emas, savolni
              noto‘g‘ri o‘qishdan bo‘lishi mumkin.
            </p>
          </>
        )}
      </section>

      {games}
    </div>
  );
}
