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
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.location.hash = '';
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    window.location.hash = '';
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
});
