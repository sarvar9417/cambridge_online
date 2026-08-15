import { useEffect, useState } from 'react';
import {
  applyTheme,
  readThemePreference,
  storeThemePreference,
  THEME_ICON,
  THEME_LABEL,
  THEME_ORDER,
  type ThemePreference,
} from '../lib/theme';

/**
 * Cycles system → light → dark.
 *
 * A three-way control rather than a binary switch, because "follow the system"
 * is the setting most people actually want and a two-state toggle silently
 * takes it away the first time it is touched.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference());

  useEffect(() => {
    applyTheme(preference);
    storeThemePreference(preference);
  }, [preference]);

  const next = THEME_ORDER[(THEME_ORDER.indexOf(preference) + 1) % THEME_ORDER.length]!;

  return (
    <button
      type="button"
      className={['theme-toggle', className].filter(Boolean).join(' ')}
      onClick={() => setPreference(next)}
      // The label states the current setting; the title states what a click does.
      aria-label={`Mavzu: ${THEME_LABEL[preference]}. Bosilsa: ${THEME_LABEL[next]}`}
      title={`Mavzu: ${THEME_LABEL[preference]} → ${THEME_LABEL[next]}`}
    >
      <span aria-hidden="true">{THEME_ICON[preference]}</span>
      <span className="theme-toggle-label">{THEME_LABEL[preference]}</span>
    </button>
  );
}
