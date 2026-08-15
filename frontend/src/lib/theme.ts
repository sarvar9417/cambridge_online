/**
 * Theme preference with three states.
 *
 * `system` writes no attribute at all, so `prefers-color-scheme` decides and the
 * page follows the operating system as it changes. `light` and `dark` stamp
 * `data-theme` on the root element, which the token blocks in theme.css treat as
 * an override.
 *
 * The choice is applied before React mounts (see `applyStoredTheme`), otherwise
 * a dark-mode user sees a white flash on every load.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'campath:theme';

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    // Private browsing and blocked storage must not break the page.
    return 'system';
  }
}

export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
}

export function storeThemePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* preference simply will not persist */
  }
}

/** Call once, as early as possible, to avoid a flash of the wrong theme. */
export function applyStoredTheme(): ThemePreference {
  const preference = readThemePreference();
  applyTheme(preference);
  return preference;
}

/** What the user actually sees right now, after resolving `system`. */
export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Tizim',
  light: 'Yorug‘',
  dark: 'Tungi',
};

export const THEME_ICON: Record<ThemePreference, string> = {
  system: '◐',
  light: '☀',
  dark: '☾',
};
