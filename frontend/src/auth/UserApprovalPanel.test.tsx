// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserApprovalPanel } from './UserApprovalPanel';

const ownerId = '00000000-0000-4000-8000-000000000001';
const targetId = '00000000-0000-4000-8000-000000000002';

const pendingUser = {
  id: targetId,
  schoolId: '00000000-0000-4000-8000-000000000010',
  fullName: 'Delete Me',
  email: 'delete@example.com',
  username: 'deleteme',
  role: 'student' as const,
  status: 'pending' as const,
  statusReason: null,
  emailVerified: true,
  note: null,
  createdAt: '2026-09-06T00:00:00.000Z',
  lastLoginAt: null,
  memberships: [],
};

const adminUser = {
  ...pendingUser,
  id: ownerId,
  fullName: 'Admin',
  email: 'admin@example.com',
  username: 'admin',
  role: 'owner' as const,
  status: 'active' as const,
};

const activeUser = { ...pendingUser, fullName: 'Student User', status: 'active' as const };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitFor(predicate: () => boolean, message: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await act(async () => { await flush(); });
  }
  throw new Error(message);
}

function findButton(container: HTMLElement, label: string) {
  return [...container.querySelectorAll('button')]
    .find((button) => button.textContent?.trim() === label) as HTMLButtonElement | undefined;
}

function setInputValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function findUser(container: HTMLElement, name: string) {
  return [...container.querySelectorAll<HTMLButtonElement>('.ua-user-button')]
    .find((button) => button.textContent?.includes(name));
}

describe('UserApprovalPanel mutation reconciliation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('removes a successfully deleted user immediately even when background refetch fails', async () => {
    let listCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/users?')) {
        listCalls += 1;
        expect(init?.cache).toBe('no-store');
        if (listCalls === 1) return json({ users: [pendingUser], total: 1 });
        return json({ error: { code: 'temporary_failure', message: 'Refresh failed.' } }, 503);
      }
      if (url.endsWith(`/admin/users/${targetId}`) && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />);
      await flush();
    });
    await waitFor(() => container.textContent?.includes(pendingUser.fullName) === true, 'initial user did not load');

    const deleteButton = findButton(container, 'Arizani o‘chirish');
    expect(deleteButton).toBeTruthy();
    await act(async () => {
      deleteButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
    });

    await waitFor(() => !container.textContent?.includes(pendingUser.fullName), 'deleted user stayed visible');
    expect(container.textContent).toContain('Ariza o‘chirildi.');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/admin/users/${targetId}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('removes a user from the current status filter as soon as approve returns the updated user', async () => {
    let listCalls = 0;
    const activeUser = { ...pendingUser, status: 'active' as const };
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/users?')) {
        listCalls += 1;
        if (listCalls === 1) return json({ users: [pendingUser], total: 1 });
        return json({ error: { code: 'temporary_failure', message: 'Refresh failed.' } }, 503);
      }
      if (url.endsWith(`/admin/users/${targetId}/approve`) && init?.method === 'POST') {
        return json({ user: activeUser });
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    }));

    await act(async () => {
      root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />);
      await flush();
    });
    await waitFor(() => findButton(container, 'Tasdiqlash') !== undefined, 'approve action did not render');

    await act(async () => {
      findButton(container, 'Tasdiqlash')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
    });

    await waitFor(() => !container.textContent?.includes(pendingUser.fullName), 'approved user stayed in pending filter');
    expect(container.textContent).toContain('Foydalanuvchi tasdiqlandi.');
  });

  it('keeps the intended user in Security when the password change refetch temporarily lists only the admin', async () => {
    let listCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/users?')) {
        listCalls += 1;
        return json(listCalls <= 2
          ? { users: [adminUser, activeUser], total: 2 }
          : { users: [adminUser], total: 1 });
      }
      if (url.endsWith(`/admin/users/${targetId}/password`) && init?.method === 'POST') {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'target did not load');
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await act(async () => { findUser(container, 'Student User')!.click(); });
    await act(async () => { findButton(container, 'Xavfsizlik')!.click(); });
    const passwordInput = container.querySelector('input[placeholder="Kamida 8 belgi"]') as HTMLInputElement;
    await act(async () => { setInputValue(passwordInput, 'new-password-123'); });
    await act(async () => { findButton(container, 'Parolni almashtirish')!.click(); await flush(); });
    await waitFor(() => listCalls >= 3, 'the account list was not refreshed');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/admin/users/${targetId}/password`),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(container.querySelector('.ua-inspector-identity h3')?.textContent).toBe('Student User');
    expect(container.textContent).toContain('Parol almashtirildi');
    expect(findButton(container, 'Parolni almashtirish')).toBeTruthy();
  });

  it('does not replace an explicitly selected account with admin on a normal list refresh', async () => {
    let listCalls = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/admin/users?')) {
        listCalls += 1;
        return json(listCalls <= 2
          ? { users: [adminUser, activeUser], total: 2 }
          : { users: [adminUser], total: 1 });
      }
      throw new Error('Unexpected request');
    }));
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'target did not load');
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await act(async () => { findUser(container, 'Student User')!.click(); });
    await act(async () => { container.querySelector<HTMLButtonElement>('button[aria-label="Ro‘yxatni yangilash"]')!.click(); await flush(); });
    await waitFor(() => listCalls >= 3, 'refresh was not requested');
    expect(container.querySelector('.ua-inspector-identity h3')?.textContent).toBe('Student User');
  });

  it('keeps the selected account after changing its login even if the list refresh omits it', async () => {
    let listCalls = 0;
    const renamedUser = { ...activeUser, username: 'student-renamed' };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/users?')) {
        listCalls += 1;
        return json(listCalls <= 2
          ? { users: [adminUser, activeUser], total: 2 }
          : { users: [adminUser], total: 1 });
      }
      if (url.endsWith(`/admin/users/${targetId}`) && init?.method === 'PATCH') {
        return json({ user: renamedUser });
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'target did not load');
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await act(async () => { findUser(container, 'Student User')!.click(); });
    const username = [...container.querySelectorAll<HTMLInputElement>('.ua-inspector input')]
      .find((input) => input.value === 'deleteme')!;
    await act(async () => { setInputValue(username, 'student-renamed'); });
    await act(async () => { findButton(container, 'O‘zgarishlarni saqlash')!.click(); await flush(); });
    await waitFor(() => listCalls >= 3, 'the account list was not refreshed');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/admin/users/${targetId}`),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(container.querySelector('.ua-inspector-identity h3')?.textContent).toBe('Student User');
    expect(container.textContent).toContain('Profil yangilandi');
  });

  it('starts a fresh selection when the admin deliberately changes the status filter', async () => {
    let listCalls = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/admin/users?')) {
        listCalls += 1;
        return json(listCalls === 1
          ? { users: [adminUser, activeUser], total: 2 }
          : { users: [adminUser], total: 1 });
      }
      throw new Error('Unexpected request');
    }));
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'target did not load');
    await act(async () => { findUser(container, 'Student User')!.click(); });
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await waitFor(() => listCalls >= 2, 'the new filter was not loaded');
    expect(container.querySelector('.ua-inspector-identity h3')?.textContent).toBe('Admin');
  });

  it('does not jump to admin after renaming the username that matched a search', async () => {
    let renamed = false;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/users?')) {
        const q = new URL(url, 'http://localhost').searchParams.get('q');
        if (q === 'deleteme') return json({ users: renamed ? [] : [activeUser], total: renamed ? 0 : 1 });
        return json({ users: [adminUser, activeUser], total: 2 });
      }
      if (url.endsWith(`/admin/users/${targetId}`) && init?.method === 'PATCH') {
        renamed = true;
        return json({ user: { ...activeUser, username: 'new-login' } });
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    }));

    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findButton(container, 'Hammasi') !== undefined, 'filters did not load');
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await act(async () => {
      setInputValue(container.querySelector<HTMLInputElement>('.ua-search input')!, 'deleteme');
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 280)); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'searched user did not load');
    await act(async () => { findUser(container, 'Student User')!.click(); });
    const username = [...container.querySelectorAll<HTMLInputElement>('.ua-inspector input')]
      .find((input) => input.value === 'deleteme')!;
    await act(async () => { setInputValue(username, 'new-login'); });
    await act(async () => { findButton(container, 'O‘zgarishlarni saqlash')!.click(); await flush(); });
    await waitFor(() => renamed, 'login update did not run');
    expect(container.querySelector('.ua-inspector-identity h3')?.textContent).toBe('Student User');
    expect(container.textContent).toContain('Profil yangilandi');
  });
});
