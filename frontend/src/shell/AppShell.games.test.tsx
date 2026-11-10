import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../lib/api';
import { parseRoute } from '../lib/router';
import { AppShell, navigationFor } from './AppShell';

describe('Interactive Games menu discovery', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    window.localStorage.removeItem('campath.sidebar.collapsed');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.location.hash = '';
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    window.location.hash = '';
    window.localStorage.removeItem('campath.sidebar.collapsed');
    vi.unstubAllGlobals();
  });

  for (const role of ['owner', 'teacher', 'student'] as const) {
    it('pins the eight games in the menu and shows a header shortcut for ' + role, async () => {
      const target = role === 'student' ? 'oquvchi/oyinlar' : 'oqitish/oyinlar';
      const group = navigationFor(role, []).find((entry) =>
        entry.label === (role === 'student' ? 'O‘rganish' : 'O‘qitish'));
      expect(group?.items[role === 'student' ? 0 : 1]).toEqual({ path: target, label: 'Interactive Games' });
      expect(group?.items.filter((item) => item.path === target)).toHaveLength(1);
      const user = { role, fullName: 'Test Teacher' } as User;
      await act(async () => root.render(
        <AppShell user={user} route={parseRoute('#' + target)}
          groups={navigationFor(role, [])} onLogout={() => {}}>
          <p>Game content</p>
        </AppShell>,
      ));
      const sidebarLink = container.querySelector<HTMLAnchorElement>('.shell-nav-groups a[href="#' + target + '"]');
      const shortcut = container.querySelector<HTMLAnchorElement>('.shell-games-shortcut');
      expect(sidebarLink?.textContent).toContain('Interactive Games');
      expect(shortcut?.getAttribute('href')).toBe('#' + target);
      expect(shortcut?.getAttribute('aria-label')).toBe('Interactive Games — O‘yinlar (8 ta)');
      expect(shortcut?.getAttribute('aria-current')).toBe('page');
      await act(async () => shortcut?.click());
      expect(window.location.hash).toBe('#' + target);
    });
  }
  it('lets desktop users close and reopen the menu without losing the current page', async () => {
    const role = 'teacher' as const;
    const user = { role, fullName: 'Test Teacher' } as User;
    const route = parseRoute('#oqitish/oyinlar');
    const view = () => <AppShell user={user} route={route} groups={navigationFor(role, [])}
      onLogout={() => {}}><p>Unchanged game content</p></AppShell>;
    await act(async () => root.render(view()));
    const shell = container.querySelector<HTMLElement>('.shell')!;
    const close = container.querySelector<HTMLButtonElement>('button[aria-label="Chap menyuni yopish"]')!;
    expect(close.getAttribute('aria-expanded')).toBe('true');
    expect(shell.classList.contains('shell--nav-collapsed')).toBe(false);
    await act(async () => close.click());
    expect(shell.classList.contains('shell--nav-collapsed')).toBe(true);
    expect(window.localStorage.getItem('campath.sidebar.collapsed')).toBe('true');
    expect(container.querySelector('button[aria-label="Chap menyuni ochish"]')?.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.shell-main')?.textContent).toContain('Unchanged game content');
    expect(window.location.hash).toBe('');
    const reopen = container.querySelector<HTMLButtonElement>('button[aria-label="Chap menyuni ochish"]')!;
    await act(async () => reopen.click());
    expect(shell.classList.contains('shell--nav-collapsed')).toBe(false);
    expect(window.localStorage.getItem('campath.sidebar.collapsed')).toBe('false');
  });

  it('restores the collapsed preference after remount and retains normal mobile menu controls', async () => {
    window.localStorage.setItem('campath.sidebar.collapsed', 'true');
    const role = 'student' as const;
    const user = { role, fullName: 'Test Student' } as User;
    const renderShell = () => <AppShell user={user} route={parseRoute('#oquvchi/oyinlar')}
      groups={navigationFor(role, [])} onLogout={() => {}}><p>Student workspace</p></AppShell>;
    await act(async () => root.render(renderShell()));
    expect(container.querySelector('.shell')?.classList.contains('shell--nav-collapsed')).toBe(true);
    expect(container.querySelector('.shell-burger')).not.toBeNull();
    expect(container.querySelector('.shell-rail a[href="#oquvchi/oyinlar"]')).not.toBeNull();
    const burger = container.querySelector<HTMLButtonElement>('.shell-burger')!;
    await act(async () => burger.click());
    expect(burger.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.shell-rail')?.classList.contains('is-open')).toBe(true);
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(renderShell()));
    expect(container.querySelector('.shell')?.classList.contains('shell--nav-collapsed')).toBe(true);
    expect(container.querySelector('button[aria-label="Chap menyuni ochish"]')).not.toBeNull();
  });

});
