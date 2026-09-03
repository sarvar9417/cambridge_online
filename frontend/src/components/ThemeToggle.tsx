import { useEffect, useState } from 'react';
import { Desktop } from '@phosphor-icons/react/Desktop';
import { Moon } from '@phosphor-icons/react/Moon';
import { Sun } from '@phosphor-icons/react/Sun';
import { applyTheme, readThemePreference, storeThemePreference, THEME_LABEL, THEME_ORDER, type ThemePreference } from '../lib/theme';

const ICON = { system: Desktop, light: Sun, dark: Moon } as const;

export function ThemeToggle({ className }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference());
  useEffect(() => { applyTheme(preference); storeThemePreference(preference); }, [preference]);
  const next = THEME_ORDER[(THEME_ORDER.indexOf(preference) + 1) % THEME_ORDER.length]!;
  const Icon = ICON[preference];
  return <button type="button" className={['theme-toggle', className].filter(Boolean).join(' ')} onClick={() => setPreference(next)} aria-label={`Mavzu: ${THEME_LABEL[preference]}. Bosilsa: ${THEME_LABEL[next]}`} title={`Mavzu: ${THEME_LABEL[preference]} → ${THEME_LABEL[next]}`}>
    <Icon size={17} weight="bold" aria-hidden="true" /><span className="theme-toggle-label">{THEME_LABEL[preference]}</span>
  </button>;
}
