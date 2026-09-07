import { useEffect, useRef, useState } from 'react';
import { api, type Attempt, type Assignment } from '../lib/api';

const ACTIVE_ATTEMPT_STATUSES = new Set(['not_started', 'in_progress']);

export type AttemptHeartbeatState = {
  remainingSeconds: number | null;
  status: string;
};

export function calculateInitialRemainingSeconds(
  attempt: Pick<Attempt, 'deadline' | 'serverNow'>,
) {
  if (!attempt.deadline) return null;
  return Math.max(
    0,
    Math.floor(
      (new Date(attempt.deadline).getTime() -
        new Date(attempt.serverNow).getTime()) /
        1000,
    ),
  );
}

export function shouldCloseAttempt(state: AttemptHeartbeatState) {
  return state.remainingSeconds === 0 || !ACTIVE_ATTEMPT_STATUSES.has(state.status);
}

export function heartbeatFailureMessage(cause: unknown) {
  return cause instanceof Error && cause.message !== 'So‘rov bajarilmadi.'
    ? cause.message
    : 'Urinish yopildi. Javoblaringiz saqlandi.';
}

type AttemptTimingHandlers = {
  onClosed(message: string): void;
  onAssignmentsRefreshed(assignments: Assignment[]): void;
};

export function useAttemptTiming(
  attempt: Attempt | null,
  handlers: AttemptTimingHandlers,
) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!attempt) {
      setRemainingSeconds(null);
      return;
    }

    setRemainingSeconds(calculateInitialRemainingSeconds(attempt));
    let active = true;

    const refreshAssignments = async () => {
      try {
        const response = await api<{ data: Assignment[] }>('/assignments');
        if (active) handlersRef.current.onAssignmentsRefreshed(response.data);
      } catch {
        // Closing an attempt is authoritative even if the follow-up list refresh fails.
      }
    };

    const heartbeat = async () => {
      try {
        const state = await api<AttemptHeartbeatState>(
          `/submissions/${attempt.submissionId}/heartbeat`,
          {
            method: 'POST',
            body: JSON.stringify({ activeSessionId: attempt.activeSessionId }),
          },
        );
        if (!active) return;

        setRemainingSeconds(state.remainingSeconds);
        if (shouldCloseAttempt(state)) {
          handlersRef.current.onClosed('Vaqt tugadi. Javoblaringiz avtomatik topshirildi.');
          await refreshAssignments();
        }
      } catch (cause) {
        if (!active) return;
        handlersRef.current.onClosed(heartbeatFailureMessage(cause));
        void refreshAssignments();
      }
    };

    const heartbeatTimer = window.setInterval(() => { void heartbeat(); }, 30_000);
    void heartbeat();
    return () => {
      active = false;
      window.clearInterval(heartbeatTimer);
    };
  }, [
    attempt?.submissionId,
    attempt?.activeSessionId,
    attempt?.deadline,
    attempt?.serverNow,
  ]);

  useEffect(() => {
    if (!attempt || remainingSeconds === null || remainingSeconds <= 0) return;
    const countdownTimer = window.setInterval(
      () =>
        setRemainingSeconds((value) =>
          value === null ? null : Math.max(0, value - 1),
        ),
      1000,
    );
    return () => window.clearInterval(countdownTimer);
  }, [attempt?.submissionId, remainingSeconds === null]);

  return remainingSeconds;
}
