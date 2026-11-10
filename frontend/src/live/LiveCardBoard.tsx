import { useState } from 'react';
import { api, type LiveExamSnapshot } from '../lib/api';
import { randomId } from '../lib/random-id';
import './live-card-board.css';

interface LiveCardBoardProps {
  snapshot: LiveExamSnapshot;
  refresh?: () => Promise<void>;
  interactive?: boolean;
}

export function LiveCardBoard({ snapshot, refresh, interactive = false }: LiveCardBoardProps) {
  const { session } = snapshot;
  const [choosing, setChoosing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const columns = Math.max(1, Math.min(5, session.settings.cardColumns ?? 5));
  const cards = snapshot.cards ?? [];
  const remaining = cards.filter((card) => !card.used).length;
  const canPick = interactive
    && remaining > 0
    && !session.pausedAt
    && (session.status === 'lobby' || session.status === 'review')
    && (session.settings.rehearsalMode || session.participantCount > 0)
    && (session.settings.practiceMode !== 'group' || session.participantCount >= 2);

  const pick = async (cardId: string) => {
    if (!canPick || choosing) return;
    setChoosing(cardId);
    setError('');
    try {
      await api(`/live-exams/${session.id}/cards/${cardId}/open`, {
        method: 'POST',
        headers: { 'Idempotency-Key': randomId() },
        body: JSON.stringify({ expectedVersion: session.version }),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Karta tanlanmadi. Qayta urinib ko‘ring.');
    } finally {
      // A competing teacher action may already have opened a card. Refresh the
      // authoritative session even when this attempt loses the version race.
      try { await refresh?.(); } catch { /* the normal snapshot poll recovers */ }
      setChoosing(null);
    }
  };

  return <section className="live-card-board" aria-label="Savol kartochkalari" data-readonly={!canPick}>
    <header>
      <div>
        <span className="live-eyebrow">LIVE CHALLENGE · CARD MODE</span>
        <h2>{interactive ? 'Ball ustunidan kartani tanlang' : 'Savol kartochkalari'}</h2>
        <p>{remaining === 0
          ? 'Barcha kartalar ishlatildi.'
          : !interactive
            ? session.settings.practiceMode
              ? 'Bu eski o‘quvchi Card sessiyasini davom ettirib bo‘lmaydi. Random rejimida yangi mashq yarating.'
              : 'Kartani faqat o‘qituvchi tanlaydi. Savol hammaga bir vaqtda ochiladi.'
            : canPick
              ? 'Kartani tanlang — savol barcha o‘quvchilarga bir vaqtda ochiladi.'
              : session.status === 'lobby' && session.participantCount === 0 && !session.settings.rehearsalMode
                ? 'Avval kamida bitta o‘quvchi xonaga qo‘shilishi kerak.'
                : 'Navbatdagi kartani tanlash uchun joriy bosqich tugashini kuting.'}</p>
      </div>
      <span className="live-card-count">{remaining} / {cards.length} karta qoldi</span>
    </header>
    <div className="live-card-scroll">
      <div className="live-card-columns" style={{
        gridTemplateColumns: `repeat(${columns}, minmax(112px, 1fr))`,
        minWidth: columns * 124,
      }}>
        {Array.from({ length: columns }, (_, index) => index + 1).map((points) => {
          const group = cards.filter((card) => card.marks === points).sort((a,b) => a.id.localeCompare(b.id));
          return <div className="live-card-column" key={points}>
            <header><strong>{points} ball</strong><small>{group.filter((card) => !card.used).length} ta qoldi</small></header>
            <div className="live-card-stack">
              {group.length ? group.map((card, index) =>
                <button type="button" key={card.id}
                  className={`live-card-tile${card.used ? ' is-used' : ''}`}
                  aria-label={`${points} ballik karta ${index + 1}${card.used ? ' — ishlatilgan' : ''}`}
                  disabled={!canPick || card.used || choosing !== null}
                  onClick={() => void pick(card.id)}>
                  <span>#{index + 1}</span>
                  <strong>{card.used ? '✓' : points}</strong>
                  <small>{card.used ? 'Tayyor' : 'BALL'}</small>
                </button>,
              ) : <p className="live-card-empty">Karta yo‘q</p>}
            </div>
          </div>;
        })}
      </div>
    </div>
    {error ? <p className="live-error" role="alert">{error}</p> : null}
  </section>;
}
