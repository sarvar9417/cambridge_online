import { useEffect, useState, type ReactNode } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { navigate, type Route } from '../lib/router';
import type { ClassItem, User } from '../lib/api';
import './shell.css';

export interface NavItem {
  path: string;
  label: string;
  /** Rendered as a pill. Zero is shown as nothing, not as "0". */
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * The three surfaces, as approved.
 *
 * A teacher never sees Boshqaruv, because approving accounts and watching AI
 * spend is not their work; an owner sees both, because they do both jobs. The
 * classes are their own group so the list can grow without pushing the rest of
 * the navigation off the screen.
 */
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
        { path: 'boshqaruv/holat', label: 'Umumiy holat' },
        { path: 'boshqaruv/odamlar', label: 'Odamlar', badge: badges.pendingUsers },
        { path: 'boshqaruv/korpus', label: 'Korpus', badge: badges.reviewQueue },
        { path: 'boshqaruv/sifat', label: 'Sifat' },
        { path: 'boshqaruv/tizim', label: 'Tizim' },
      ],
    });
  }

  if (role !== 'student') {
    groups.push({
      label: 'O‘qitish',
      items: [
        { path: 'oqitish/savol-banki', label: 'Savol banki' },
        { path: 'oqitish/tanlovlar', label: 'Tanlovlarim' },
        { path: 'oqitish/vazifalar', label: 'Vazifalar' },
        { path: 'oqitish/tekshirish', label: 'Tekshirish', badge: badges.openAppeals },
        { path: 'oqitish/oquvchilar', label: 'O‘quvchilar' },
      ],
    });
  } else {
    groups.push({
      label: 'O‘rganish',
      items: [
        { path: 'oquvchi/uy', label: 'Uy' },
        { path: 'oquvchi/vazifalar', label: 'Vazifalar' },
        { path: 'oquvchi/natijalar', label: 'Natijalar' },
        { path: 'oquvchi/organish', label: 'O‘rganish' },
      ],
    });
  }

  if (role !== 'student' && classes.length) {
    groups.push({
      label: 'Sinflar',
      items: classes.map((item) => ({ path: `oqitish/sinf?id=${item.id}`, label: item.name })),
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

  // On a phone the rail is a drawer. Following a link has to close it, or the
  // page changes behind a panel that is still covering it.
  useEffect(() => { setMenuOpen(false); }, [route.path]);

  const roleLabel = user.role === 'owner' ? 'Administrator'
    : user.role === 'teacher' ? 'O‘qituvchi' : 'O‘quvchi';

  return (
    <div className="shell">
      <a className="shell-skip" href="#main">Asosiy qismga o‘tish</a>

      <nav className={`shell-rail${menuOpen ? ' is-open' : ''}`} aria-label="Asosiy navigatsiya">
        <div className="shell-brand">
          <span className="shell-mark" aria-hidden="true">◆</span>
          <span>CamPath</span>
        </div>

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
                  <span>{item.label}</span>
                  {item.badge ? <b className="shell-badge">{item.badge}</b> : null}
                </a>
              );
            })}
          </div>
        ))}

        <div className="shell-rail-foot">
          <button type="button" className="shell-ghost" onClick={onLogout}>Chiqish</button>
        </div>
      </nav>

      <div className="shell-body">
        <header className="shell-top">
          <button
            type="button" className="shell-burger" aria-expanded={menuOpen}
            aria-label="Menyu" onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
          <div className="shell-who">
            <strong>{user.fullName}</strong>
            <span>{roleLabel}</span>
          </div>
          <ThemeToggle />
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
