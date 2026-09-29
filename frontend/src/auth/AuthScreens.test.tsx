import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthScreens } from './AuthScreens';

describe('authentication form lifecycle', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    window.history.replaceState(null, '', '/');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    window.history.replaceState(null, '', '/');
    vi.unstubAllGlobals();
  });

  it('consumes a verification link once under StrictMode and keeps the success screen', async () => {
    window.history.replaceState(null, '', '/verify-email?token=single-use-verification-token');
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => root.render(<StrictMode><AuthScreens onSignedIn={() => {}} /></StrictMode>));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/email/verify');
    expect(container.querySelector('h1')?.textContent).toBe('Email tasdiqlandi');
    expect(window.location.search).toBe('');
  });

  it('shows an invalid link once without retrying the consumed token', async () => {
    window.history.replaceState(null, '', '/verify-email?token=expired-verification-token');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      error: { code: 'verification_invalid', message: 'Havola yaroqsiz.' },
    }), { status: 410, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => root.render(<StrictMode><AuthScreens onSignedIn={() => {}} /></StrictMode>));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.querySelector('h1')?.textContent).toBe('Tasdiqlanmadi');
    expect(container.textContent).toContain('Havola yaroqsiz.');
  });

  it('clears the sign-in password before opening registration', async () => {
    await act(async () => root.render(<AuthScreens onSignedIn={() => {}} />));
    const input = container.querySelector<HTMLInputElement>('input[name="password"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'private-login-password');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(input.value).toBe('private-login-password');

    await act(async () => {
      [...container.querySelectorAll('button')].find(button => button.textContent === 'Hisob yaratish')!.click();
    });

    expect(container.querySelector('h1')?.textContent).toBe('Ro‘yxatdan o‘tish');
    expect(container.querySelector<HTMLInputElement>('input[name="password"]')!.value).toBe('');
  });
});
