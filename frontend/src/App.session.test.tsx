import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AUTH_EXPIRED_EVENT, SESSION_CHANGED_KEY, setAccessToken, synchronizeSession } from './lib/api';

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
    synchronizeSession();
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

  it('clears the mounted account when another tab changes the shared session', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return url.endsWith('/auth/refresh') ? json(200, session) : dataResponse(url);
    }));
    await act(async () => root.render(<App />));
    await act(async () => { await flush(); });
    expect(container.querySelector('.shell')).not.toBeNull();

    await act(async () => {
      localStorage.setItem(SESSION_CHANGED_KEY, 'another-tab-session');
      window.dispatchEvent(new StorageEvent('storage', { key: SESSION_CHANGED_KEY, newValue: 'another-tab-session' }));
    });
    expect(container.querySelector('.shell')).toBeNull();
    expect(container.querySelector('.auth')).not.toBeNull();
    expect(container.textContent).not.toContain('Session Test');
  });

  it.each(['teacher', 'student'] as const)('redirects a %s away from a direct administrator URL without mounting its requests', async (role) => {
    window.history.replaceState(null, '', '/#boshqaruv/odamlar');
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) return json(200, { ...session, user: { ...session.user, role } });
      if (url.endsWith('/selections')) return json(200, []);
      if (url.endsWith('/questions/filter-options')) return json(200, {
        syllabi: [], components: [], topics: [], subtopics: [], commandWords: [], years: [], sessions: [], aos: [],
      });
      return dataResponse(url);
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => root.render(<App />));
    await act(async () => { await flush(); await flush(); });

    expect(window.location.hash).toBe(role === 'teacher' ? '#oqitish/savol-banki' : '#oquvchi/uy');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/admin/'))).toBe(false);
    expect(container.textContent).not.toContain('Yangi foydalanuvchi');
  });

  it('refreshes the grading queue when a teacher returns after a learner submits', async () => {
    window.history.replaceState(null, '', '/#oqitish/tekshirish');
    let submitted = false;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) return json(200, { ...session, user: { ...session.user, role: 'teacher' } });
      if (url.includes('/grading/queue')) return json(200, { data: submitted ? [{
        id: 'grading-id', text: '39', displayRef: 'Q1', stemMd: 'Convert to denary.',
        marks: 1, answerKind: 'text', studentName: 'New learner answer', points: [],
      }] : [] });
      return dataResponse(url);
    }));
    await act(async () => root.render(<App />));
    await act(async () => { await flush(); });
    expect(container.textContent).toContain('Navbat bo‘sh');
    await act(async () => {
      window.location.hash = 'oqitish/vazifalar';
      await flush();
    });
    submitted = true;
    await act(async () => {
      window.location.hash = 'oqitish/tekshirish';
      await flush();
    });
    await act(async () => { await flush(); });
    expect(container.textContent).toContain('New learner answer');
    expect(container.textContent).toContain('Convert to denary.');
  });

  it('loads newly published assignments and released results on student navigation', async () => {
    let updated = false;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) return json(200, session);
      if (url.endsWith('/assignments') && updated) return json(200, { data: [{
        id: 'assignment-id', title: 'New assignment', className: 'QA Class', totalMarks: 1,
        dueAt: null, timeLimitMin: null, submissionStatus: 'not_started',
      }] });
      if (url.endsWith('/results') && updated) return json(200, { data: [{
        id: 'result-id', title: 'New result', className: 'QA Class', totalScore: 1,
        totalMax: 1, percentage: 100, grade: null, releasedAt: '2026-09-28T08:30:00Z',
      }] });
      return dataResponse(url);
    }));
    await act(async () => root.render(<App />));
    await act(async () => { await flush(); });
    updated = true;
    await act(async () => { window.location.hash = 'oquvchi/vazifalar'; await flush(); });
    await act(async () => { await flush(); });
    expect(container.textContent).toContain('New assignment');
    await act(async () => { window.location.hash = 'oquvchi/natijalar'; await flush(); });
    await act(async () => { await flush(); });
    expect(container.textContent).toContain('New result');
    expect(container.textContent).toContain('100%');
  });
});
