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
const anotherUser = {
  ...activeUser,
  id: '00000000-0000-4000-8000-000000000003',
  fullName: 'Another Student',
  email: 'another@example.com',
  username: 'another',
};

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
      if (url.endsWith(`/admin/users/${targetId}`) && !init?.method) return json({ user: activeUser });
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
      if (String(input).endsWith(`/admin/users/${targetId}`)) return json({ user: activeUser });
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
      if (url.endsWith(`/admin/users/${targetId}`) && !init?.method) return json({ user: renamedUser });
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
      if (url.endsWith(`/admin/users/${targetId}`) && !init?.method) {
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

  it('does not lose the selected user when the active status filter is clicked again', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/admin/users?')) return json({ users: [pendingUser], total: 1 });
      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => container.querySelector('.ua-inspector-identity h3')?.textContent === 'Delete Me', 'user did not load');
    const previousCount = fetchMock.mock.calls.length;
    await act(async () => { findButton(container, 'Kutilmoqda')!.click(); await flush(); });
    expect(container.querySelector('.ua-inspector-identity h3')?.textContent).toBe('Delete Me');
    expect(fetchMock).toHaveBeenCalledTimes(previousCount);
  });

  it('clears an unsubmitted password when switching between accounts', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/admin/users?')) return json({ users: [adminUser, activeUser], total: 2 });
      throw new Error(`Unexpected request: ${input}`);
    }));
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'user did not load');
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await act(async () => { findUser(container, 'Student User')!.click(); findButton(container, 'Xavfsizlik')!.click(); });
    await act(async () => {
      setInputValue(container.querySelector<HTMLInputElement>('.ua-inspector input[type="password"]')!, 'unsubmitted-password');
    });
    await act(async () => { findUser(container, 'Admin')!.click(); findUser(container, 'Student User')!.click(); findButton(container, 'Xavfsizlik')!.click(); });
    expect(container.querySelector<HTMLInputElement>('.ua-inspector input[type="password"]')?.value).toBe('');
  });

  it('does not switch the inspector back when an earlier profile request completes late', async () => {
    let finishUpdate!: (response: Response) => void;
    const delayedUpdate = new Promise<Response>((resolve) => { finishUpdate = resolve; });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/users?')) {
        const isSearching = new URL(url, 'http://localhost').searchParams.has('q');
        return isSearching
          ? json({ users: [activeUser, anotherUser], total: 2 })
          : json({ users: [adminUser, activeUser, anotherUser], total: 3 });
      }
      if (url.endsWith(`/admin/users/${targetId}`) && init?.method === 'PATCH') return delayedUpdate;
      if (url.endsWith(`/admin/users/${targetId}`) && !init?.method) return json({ user: { ...activeUser, fullName: 'Renamed User' } });
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    }));
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'user did not load');
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await act(async () => { setInputValue(container.querySelector<HTMLInputElement>('.ua-search input')!, 'Student'); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 280)); await flush(); });
    await act(async () => { findUser(container, 'Student User')!.click(); });
    const input = [...container.querySelectorAll<HTMLInputElement>('.ua-inspector input')]
      .find((node) => node.value === 'Student User')!;
    await act(async () => { setInputValue(input, 'Renamed User'); });
    await act(async () => { findButton(container, 'O‘zgarishlarni saqlash')!.click(); await flush(); });
    await act(async () => { findUser(container, 'Another Student')!.click(); });
    await act(async () => { finishUpdate(json({ user: { ...activeUser, fullName: 'Renamed User' } })); await flush(); });
    expect(container.querySelector('.ua-inspector-identity h3')?.textContent).toBe('Another Student');
  });

  it('removes a stale inspector when the server confirms that account no longer exists', async () => {
    let listCalls = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/admin/users?')) {
        listCalls += 1;
        return json(listCalls <= 2
          ? { users: [adminUser, activeUser], total: 2 }
          : { users: [adminUser], total: 1 });
      }
      if (url.endsWith(`/admin/users/${targetId}`)) {
        return json({ error: { code: 'user_not_found', message: 'Foydalanuvchi topilmadi.' } }, 404);
      }
      throw new Error(`Unexpected request: ${url}`);
    }));
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'user did not load');
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await act(async () => { findUser(container, 'Student User')!.click(); });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Ro‘yxatni yangilash"]')!.click();
      await flush();
    });
    await waitFor(() => container.textContent?.includes('Tanlangan foydalanuvchi topilmadi') === true, 'deleted user was not invalidated');
    expect(container.querySelector('.ua-inspector-identity h3')).toBeNull();
  });

  it('serializes account changes so a second user cannot be changed during a pending request', async () => {
    let finishUpdate!: (response: Response) => void;
    const delayedUpdate = new Promise<Response>((resolve) => { finishUpdate = resolve; });
    let patchCount = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/users?')) return json({ users: [adminUser, activeUser, anotherUser], total: 3 });
      if (url.endsWith(`/admin/users/${targetId}`) && init?.method === 'PATCH') {
        patchCount += 1;
        return delayedUpdate;
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    }));
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'user did not load');
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await act(async () => { findUser(container, 'Student User')!.click(); });
    await act(async () => {
      findButton(container, 'O‘zgarishlarni saqlash')!.click();
      findButton(container, 'O‘zgarishlarni saqlash')!.click();
      await flush();
    });
    expect(patchCount).toBe(1);
    await act(async () => { findUser(container, 'Another Student')!.click(); });
    expect(findButton(container, 'O‘zgarishlarni saqlash')?.disabled).toBe(true);
    expect(findButton(container, 'Hammasi')?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('.ua-search input')?.disabled).toBe(true);
    expect(container.querySelector<HTMLSelectElement>('.ua-role-filter')?.disabled).toBe(true);
    await act(async () => { finishUpdate(json({ user: activeUser })); await flush(); });
    expect(findButton(container, 'O‘zgarishlarni saqlash')?.disabled).toBe(false);
    expect(findButton(container, 'Hammasi')?.disabled).toBe(false);
    expect(container.querySelector('.ua-inspector-identity h3')?.textContent).toBe('Another Student');
  });

  it('does not retain an initial password when a new-account form is closed and reopened', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/admin/users?')) return json({ users: [pendingUser], total: 1 });
      throw new Error(`Unexpected request: ${input}`);
    }));
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await waitFor(() => findButton(container, '+ Yangi foydalanuvchi') !== undefined, 'create action missing');
    await act(async () => { findButton(container, '+ Yangi foydalanuvchi')!.click(); });
    await act(async () => {
      setInputValue(container.querySelector<HTMLInputElement>('.ua-create input[type="password"]')!, 'secret-in-progress');
    });
    await act(async () => { findButton(container, 'Yaratishni yopish')!.click(); });
    await act(async () => { findButton(container, '+ Yangi foydalanuvchi')!.click(); });
    expect(container.querySelector<HTMLInputElement>('.ua-create input[type="password"]')?.value).toBe('');
  });

  it('does not select an already removed account after a bulk suspension', async () => {
    const suspended = new Set<string>();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/admin/users?')) {
        const status = new URL(url, 'http://localhost').searchParams.get('status');
        const matches = status === 'active'
          ? [activeUser, anotherUser].filter((user) => !suspended.has(user.id))
          : [];
        return json({ users: matches, total: matches.length });
      }
      const match = url.match(/\/admin\/users\/([^/]+)\/status$/);
      if (match && init?.method === 'POST') {
        suspended.add(match[1]);
        return json({ user: { ...[activeUser, anotherUser].find((user) => user.id === match[1]), status: 'suspended' } });
      }
      if (url.endsWith(`/admin/users/${targetId}`)) return json({ user: { ...activeUser, status: 'suspended' } });
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`);
    }));
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await act(async () => { findButton(container, 'Faol')!.click(); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'active users did not load');
    const checkboxes = [...container.querySelectorAll<HTMLInputElement>('.ua-check')];
    await act(async () => { checkboxes.forEach((checkbox) => checkbox.click()); });
    await act(async () => { findButton(container, 'To‘xtatish')!.click(); await flush(); });
    await waitFor(() => suspended.size === 2, 'not all accounts were suspended');
    expect(container.querySelector('.ua-inspector-identity h3')).toBeNull();
    expect(container.textContent).toContain('2 ta foydalanuvchida amal bajarildi');
  });

  it('clears old bulk selections while a new filter is still loading', async () => {
    let resolveActive!: (response: Response) => void;
    const activeResponse = new Promise<Response>((resolve) => { resolveActive = resolve; });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes('/admin/users?')) throw new Error(`Unexpected request: ${url}`);
      const status = new URL(url, 'http://localhost').searchParams.get('status');
      if (status === 'pending') return json({ users: [pendingUser], total: 1 });
      if (status === 'active') return activeResponse;
      return json({ users: [adminUser, activeUser], total: 2 });
    }));
    await act(async () => { root.render(<UserApprovalPanel classes={[]} currentUserId={ownerId} />); await flush(); });
    await act(async () => { findButton(container, 'Hammasi')!.click(); await flush(); });
    await waitFor(() => findUser(container, 'Student User') !== undefined, 'users did not load');
    await act(async () => { container.querySelector<HTMLInputElement>('.ua-check:not(:disabled)')!.click(); });
    expect(container.querySelector('.ua-bulk')).not.toBeNull();

    await act(async () => { findButton(container, 'Faol')!.click(); await flush(); });
    expect(container.querySelector('.ua-bulk')).toBeNull();
    expect(container.querySelectorAll('.ua-user-button')).toHaveLength(0);
    await act(async () => { resolveActive(json({ users: [activeUser], total: 1 })); await flush(); });
    expect(findUser(container, 'Student User')).toBeDefined();
  });
});
