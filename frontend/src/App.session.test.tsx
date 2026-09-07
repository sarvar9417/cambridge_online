import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AUTH_EXPIRED_EVENT, setAccessToken } from './lib/api';

const session = {
  accessToken: 'valid-access-token',
  user: { id: 'student-id', fullName: 'Session Test', role: 'student', schoolId: null },
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});
const dataResponse = (url: string) => json(200, {
  data: url.endsWith('/content/games') ? { termMatch: [], sequence: [], spotTheGap: [] } : [],
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 25));

describe('App session restoration', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    window.history.replaceState(null, '', '/#oquvchi/uy');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    setAccessToken(null);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    setAccessToken(null);
    vi.unstubAllGlobals();
  });

  it('restores a saved session once under StrictMode without revoking it', async () => {
    let refreshCalls = 0;
    let revoked = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        const call = ++refreshCalls;
        await flush();
        if (call === 1) return json(200, session);
        revoked = true;
        return json(410, { error: { code: 'refresh_reused', message: 'Refresh reused' } });
      }
      return revoked ? json(401, { error: { message: 'Revoked token' } }) : dataResponse(url);
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => root.render(<StrictMode><App /></StrictMode>));
    await act(async () => { await flush(); await flush(); await flush(); });

    expect(refreshCalls).toBe(1);
    expect(revoked).toBe(false);
    expect(container.querySelector('.shell')).not.toBeNull();
    expect(container.querySelector('.app-error')).toBeNull();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/classes'))).toHaveLength(1);
  });

  it('clears the previous expiry warning after signing in again', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh') || url.endsWith('/auth/login')) return json(200, session);
      return dataResponse(url);
    }));
    await act(async () => root.render(<App />));
    await act(async () => { await flush(); });
    expect(container.querySelector('.shell')).not.toBeNull();

    await act(async () => { window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)); });
    expect(container.querySelector('.auth')).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      for (const [name, value] of [['identifier', 'session-test'], ['password', 'test-password']]) {
        const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flush();
    });

    expect(container.querySelector('.shell')).not.toBeNull();
    expect(container.textContent).not.toContain('Sessiya muddati tugadi. Qayta kiring.');
  });
});
