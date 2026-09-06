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

describe('UserApprovalPanel mutation reconciliation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
});
