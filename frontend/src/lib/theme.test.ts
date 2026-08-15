import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyStoredTheme,
  applyTheme,
  readThemePreference,
  resolveTheme,
  storeThemePreference,
  THEME_ORDER,
} from './theme';

const root = () => document.documentElement;

/**
 * A real in-memory store rather than whatever the environment provides.
 * Another suite in this worker replaces `localStorage` with a partial stub, and
 * these tests are about the module's own behaviour, not the environment's.
 */
function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal('localStorage', memoryStorage());
  root().removeAttribute('data-theme');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('theme preference', () => {
  it('defaults to following the system', () => {
    expect(readThemePreference()).toBe('system');
  });

  it('ignores a stored value that is not a preference', () => {
    localStorage.setItem('campath:theme', 'neon');
    expect(readThemePreference()).toBe('system');
  });

  it('round-trips an explicit choice', () => {
    storeThemePreference('dark');
    expect(readThemePreference()).toBe('dark');
  });

  it('clears storage when the user goes back to system', () => {
    storeThemePreference('dark');
    storeThemePreference('system');
    expect(localStorage.getItem('campath:theme')).toBeNull();
    expect(readThemePreference()).toBe('system');
  });

  it('survives storage being unavailable', () => {
    // Private browsing throws on both read and write; the page must still load.
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    });
    expect(() => storeThemePreference('dark')).not.toThrow();
    expect(readThemePreference()).toBe('system');
  });
});

describe('applyTheme', () => {
  it('stamps the attribute for an explicit choice', () => {
    applyTheme('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
    applyTheme('light');
    expect(root().getAttribute('data-theme')).toBe('light');
  });

  it('removes the attribute for system, so prefers-color-scheme decides', () => {
    applyTheme('dark');
    applyTheme('system');
    expect(root().hasAttribute('data-theme')).toBe(false);
  });

  it('applies the stored choice before the app renders', () => {
    localStorage.setItem('campath:theme', 'dark');
    expect(applyStoredTheme()).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
  });
});

describe('resolveTheme', () => {
  it('passes an explicit choice straight through', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });

  it('reads the system setting for the system preference', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('dark'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(resolveTheme('system')).toBe('dark');
  });
});

describe('toggle order', () => {
  it('cycles system → light → dark → system', () => {
    expect(THEME_ORDER).toEqual(['system', 'light', 'dark']);
    const next = (current: (typeof THEME_ORDER)[number]) =>
      THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
    expect(next('system')).toBe('light');
    expect(next('light')).toBe('dark');
    // Returning to system matters: a two-state switch would take away the
    // "follow the operating system" option the first time it is used.
    expect(next('dark')).toBe('system');
  });
});
