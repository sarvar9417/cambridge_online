import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { flushAnswers, type PendingAnswer } from '../lib/offline-queue';

type ConnectivityTarget = {
  addEventListener(type: 'online' | 'offline', listener: () => void): void;
  removeEventListener(type: 'online' | 'offline', listener: () => void): void;
};

export function installOfflineAnswerSync(
  target: ConnectivityTarget,
  flushPending: () => Promise<void>,
  setOnline: (online: boolean) => void,
) {
  const sync = () => {
    setOnline(true);
    void flushPending();
  };
  const offline = () => setOnline(false);

  target.addEventListener('online', sync);
  target.addEventListener('offline', offline);
  sync();

  return () => {
    target.removeEventListener('online', sync);
    target.removeEventListener('offline', offline);
  };
}

export async function sendPendingAnswer(answer: PendingAnswer) {
  await api(
    `/submissions/${answer.submissionId}/answers/${answer.questionId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        text: answer.text,
        activeSessionId: answer.activeSessionId,
      }),
    },
  );
}

export function useOfflineAnswerSync() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const flushPending = useCallback(
    () => flushAnswers(localStorage, sendPendingAnswer),
    [],
  );

  useEffect(
    () => installOfflineAnswerSync(window, flushPending, setOnline),
    [flushPending],
  );

  return { online, flushPending };
}
