import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export function useFlashcardReview(cardId: string | undefined, onReviewed: (cardId: string) => void) {
  const pending = useRef(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setError(''), [cardId]);

  const grade = async (value: number) => {
    if (!cardId || pending.current) return;
    pending.current = true;
    setReviewing(true);
    setError('');
    try {
      await api(`/content/flashcards/${cardId}/review`, { method: 'POST', body: JSON.stringify({ grade: value }) });
      onReviewed(cardId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kartochka natijasi saqlanmadi. Qayta urinib ko‘ring.');
    } finally {
      pending.current = false;
      setReviewing(false);
    }
  };
  return { grade, reviewing, error };
}
