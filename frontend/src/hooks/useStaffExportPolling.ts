import { useEffect, useRef } from 'react';
import { api, type ExportItem, type User } from '../lib/api';

type TimerTarget = {
  setInterval(handler: () => void, milliseconds: number): number;
  clearInterval(id: number): void;
};

export function shouldPollExports(
  role: User['role'] | null | undefined,
  exports: Pick<ExportItem, 'status'>[],
) {
  return Boolean(
    role &&
      role !== 'student' &&
      exports.some((item) => item.status === 'queued' || item.status === 'running'),
  );
}

export function installExportPolling(
  target: TimerTarget,
  refresh: () => Promise<void>,
  intervalMs = 2_000,
) {
  const timer = target.setInterval(() => { void refresh(); }, intervalMs);
  return () => target.clearInterval(timer);
}

export function useStaffExportPolling(
  role: User['role'] | null | undefined,
  exports: ExportItem[],
  onRefreshed: (items: ExportItem[]) => void,
) {
  const callbackRef = useRef(onRefreshed);
  callbackRef.current = onRefreshed;

  useEffect(() => {
    if (!shouldPollExports(role, exports)) return;
    const refresh = async () => {
      try {
        const response = await api<{ data: ExportItem[] }>('/exports');
        callbackRef.current(response.data);
      } catch {
        // Polling is advisory; the page remains usable and the next interval retries.
      }
    };
    return installExportPolling(window, refresh);
  }, [role, exports.some((item) => item.status === 'queued' || item.status === 'running')]);
}
