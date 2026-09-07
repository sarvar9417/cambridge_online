import { useEffect, useRef, useState } from 'react';
import {
  api,
  AUTH_EXPIRED_EVENT,
  setAccessToken,
  type User,
} from '../lib/api';

export type SessionPayload = { accessToken: string; user: User };

type WindowLike = {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
};

export function installAuthExpiryListener(
  target: WindowLike,
  onExpired: () => void,
) {
  const expired: EventListener = () => {
    setAccessToken(null);
    onExpired();
  };
  target.addEventListener(AUTH_EXPIRED_EVENT, expired);
  return () => target.removeEventListener(AUTH_EXPIRED_EVENT, expired);
}

export function useSessionLifecycle(
  onSession: (session: SessionPayload) => Promise<void> | void,
  onExpired: () => void,
) {
  const [loading, setLoading] = useState(true);
  const onSessionRef = useRef(onSession);
  const onExpiredRef = useRef(onExpired);
  onSessionRef.current = onSession;
  onExpiredRef.current = onExpired;

  useEffect(
    () => installAuthExpiryListener(window, () => onExpiredRef.current()),
    [],
  );

  useEffect(() => {
    let active = true;
    api<SessionPayload>(
      '/auth/refresh',
      { method: 'POST' },
      { suppressAuthExpired: true },
    )
      .then((session) => {
        if (active) return onSessionRef.current(session);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return loading;
}
