import { useEffect, useState, type ReactNode } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { navigate, type Route } from '../lib/router';
import type { ClassItem, User } from '../lib/api';
import './shell.css';

type NavIcon =
  | 'overview' | 'users' | 'database' | 'quality' | 'settings'
  | 'search' | 'bookmark' | 'clipboard' | 'review' | 'students'
  | 'home' | 'results' | 'learn' | 'class';

export interface NavItem {
  path: string;
  label: string;
  icon?: NavIcon;
  /** Rendered as a pill. Zero is shown as nothing, not as "0". */
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const iconPaths: Record<NavIcon, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></>,
  quality: <><path d="m12 3 2.3 4.66 5.15.75-3.73 3.64.88 5.13L12 14.77l-4.6 2.41.88-5.13-3.73-3.64 5.15-.75L12 3Z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 7.2 15a1.65 1.65 0 0 0-1.51-1H5.6v-3h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.93 6l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V4.8h3v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.12 2.12-.06.06A1.65 1.65 0 0 0 19.4 10c.12.37.18.76.18 1.15v1.7c0 .39-.06.78-.18 1.15Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5A2.5 2.5 0 0 1 11.5 2h1A2.5 2.5 0 0 1 15 4.5V6H9V4.5Z"/><path d="M9 11h6M9 15h6"/></>,
  review: <><path d="M9 11l2 2 4-4"/><path d="M21 12a9 9 0 1 1-4.22-7.63"/></>,
  students: <><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 10v6"/></>,
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  results: <><path d="M4 19V9M10 19V5M16 19v-8M22 19V3"/></>,
  learn: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H14v15h3.5a2.5 2.5 0 0 1 2.5 2.5v-15Z"/></>,
  class: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h4M7 16h6"/></>,
};

function Icon({ name }: { name: NavIcon }) {
  return (
    <svg className="shell-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

/** Role-aware navigation. The information architecture stays stable; the shell only improves presentation. */
export function navigationFor(
  role: User['role'],
  classes: ClassItem[],
  badges: { pendingUsers?: number; reviewQueue?: number; openAppeals?: number } = {},
): NavGroup[] {
  const groups: NavGroup[] = [];

  if (role === 'owner') {
    groups.push({
      label: 'Boshqaruv',
      items: [
        { path: 'boshqaruv/holat', label: 'Umumiy holat', icon: 'overview' },
        { path: 'boshqaruv/odamlar', label: 'Odamlar', icon: 'users', badge: badges.pendingUsers },
        { path: 'boshqaruv/korpus', label: 'Korpus', icon: 'database', badge: badges.reviewQueue },
        { path: 'boshqaruv/sifat', label: 'Sifat', icon: 'quality' },
        { path: 'boshqaruv/tizim', label: 'Tizim', icon: 'settings' },
      ],
    });
  }

  if (role !== 'student') {
    groups.push({
      label: 'O‘qitish',
      items: [
        { path: 'oqitish/savol-banki', label: 'Savol banki', icon: 'search' },
        { path: 'oqitish/tanlovlar', label: 'Tanlovlarim', icon: 'bookmark' },
        { path: 'oqitish/vazifalar', label: 'Vazifalar', icon: 'clipboard' },
        { path: 'oqitish/tekshirish', label: 'Tekshirish', icon: 'review', badge: badges.openAppeals },
        { path: 'oqitish/oquvchilar', label: 'O‘quvchilar', icon: 'students' },
      ],
    });
  } else {
    groups.push({
      label: 'O‘rganish',
      items: [
        { path: 'oquvchi/uy', label: 'Uy', icon: 'home' },
        { path: 'oquvchi/vazifalar', label: 'Vazifalar', icon: 'clipboard' },
        { path: 'oquvchi/natijalar', label: 'Natijalar', icon: 'results' },
        { path: 'oquvchi/organish', label: 'O‘rganish', icon: 'learn' },
      ],
    });
  }

  if (role !== 'student' && classes.length) {
    groups.push({
      label: 'Sinflar',
      items: classes.map((item) => ({ path: `oqitish/sinf?id=${item.id}`, label: item.name, icon: 'class' })),
    });
  }

  return groups;
}

export function AppShell({ user, route, groups, onLogout, children }: {
  user: User;
  route: Route;
  groups: NavGroup[];
  onLogout: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [route.path]);

  const roleLabel = user.role === 'owner' ? 'Administrator'
    : user.role === 'teacher' ? 'O‘qituvchi' : 'O‘quvchi';
  const currentItem = groups.flatMap((group) => group.items)
    .find((item) => route.path === item.path || route.path === item.path.split('?')[0]);
  const currentGroup = groups.find((group) => group.items.includes(currentItem!));
  const initials = user.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'C';

  return (
    <div className="shell">
      <a className="shell-skip" href="#main">Asosiy qismga o‘tish</a>

      <nav className={`shell-rail${menuOpen ? ' is-open' : ''}`} aria-label="Asosiy navigatsiya">
        <div className="shell-brand">
          <span className="shell-mark" aria-hidden="true">C</span>
          <span className="shell-brand-copy">
            <strong>CamPath</strong>
            <small>Cambridge Learning OS</small>
          </span>
        </div>

        <div className="shell-nav-scroll">
          {groups.map((group) => (
            <div className="shell-group" key={group.label}>
              <p className="shell-group-label">{group.label}</p>
              {group.items.map((item) => {
                const active = route.path === item.path || route.path === item.path.split('?')[0];
                return (
                  <a
                    key={item.path}
                    href={`#${item.path}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={(event) => { event.preventDefault(); navigate(item.path); }}
                  >
                    <span className="shell-nav-main">
                      {item.icon ? <Icon name={item.icon} /> : null}
                      <span>{item.label}</span>
                    </span>
                    {item.badge ? <b className="shell-badge">{item.badge}</b> : null}
                  </a>
                );
              })}
            </div>
          ))}
        </div>

        <div className="shell-rail-foot">
          <div className="shell-rail-user">
            <span className="shell-avatar shell-avatar-small">{initials}</span>
            <span><strong>{user.fullName}</strong><small>{roleLabel}</small></span>
          </div>
          <button type="button" className="shell-ghost" onClick={onLogout}>Chiqish</button>
        </div>
      </nav>

      <div className="shell-body">
        <header className="shell-top">
          <button
            type="button" className="shell-burger" aria-expanded={menuOpen}
            aria-label="Menyu" onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div className="shell-page-meta">
            <span>{currentGroup?.label ?? 'CamPath'}</span>
            <strong>{currentItem?.label ?? 'Workspace'}</strong>
          </div>
          <div className="shell-actions">
            <ThemeToggle />
            <div className="shell-who">
              <span className="shell-avatar">{initials}</span>
              <span className="shell-who-copy"><strong>{user.fullName}</strong><small>{roleLabel}</small></span>
            </div>
          </div>
        </header>

        <main id="main" className="shell-main">{children}</main>
      </div>

      {menuOpen ? (
        <button
          type="button" className="shell-scrim" aria-label="Menyuni yopish"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  );
}
