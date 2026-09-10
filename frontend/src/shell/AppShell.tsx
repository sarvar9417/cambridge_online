import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import type { IconProps } from '@phosphor-icons/react/lib';
import { Archive } from '@phosphor-icons/react/Archive';
import { BookOpenText } from '@phosphor-icons/react/BookOpenText';
import { CaretDown } from '@phosphor-icons/react/CaretDown';
import { ChartBar } from '@phosphor-icons/react/ChartBar';
import { CheckSquare } from '@phosphor-icons/react/CheckSquare';
import { CirclesFour } from '@phosphor-icons/react/CirclesFour';
import { ClipboardText } from '@phosphor-icons/react/ClipboardText';
import { FolderOpen } from '@phosphor-icons/react/FolderOpen';
import { GearSix } from '@phosphor-icons/react/GearSix';
import { House } from '@phosphor-icons/react/House';
import { ListChecks } from '@phosphor-icons/react/ListChecks';
import { Question } from '@phosphor-icons/react/Question';
import { SignOut } from '@phosphor-icons/react/SignOut';
import { SquaresFour } from '@phosphor-icons/react/SquaresFour';
import { UsersThree } from '@phosphor-icons/react/UsersThree';
import { X } from '@phosphor-icons/react/X';
import { ThemeToggle } from '../components/ThemeToggle';
import { navigate, type Route } from '../lib/router';
import type { ClassItem, User } from '../lib/api';
import './shell.css';

export interface NavItem { path: string; label: string; badge?: number; }
export interface NavGroup { label: string; items: NavItem[]; }

export function navigationFor(role: User['role'], classes: ClassItem[], badges: { pendingUsers?: number; reviewQueue?: number; openAppeals?: number } = {}): NavGroup[] {
  const groups: NavGroup[] = [];
  if (role === 'owner') groups.push({ label: 'Boshqaruv', items: [
    { path: 'boshqaruv/holat', label: 'Ish stoli' }, { path: 'boshqaruv/odamlar', label: 'Odamlar', badge: badges.pendingUsers },
    { path: 'boshqaruv/korpus', label: 'Korpus', badge: badges.reviewQueue }, { path: 'boshqaruv/sifat', label: 'Sifat' }, { path: 'boshqaruv/tizim', label: 'Tizim' },
  ] });
  if (role !== 'student') groups.push({ label: 'O‘qitish', items: [
    { path: 'oqitish/darslar', label: 'Darslar' }, { path: 'oqitish/savol-banki', label: 'Savol banki' },
    { path: 'oqitish/tanlovlar', label: 'Tanlovlarim' }, { path: 'oqitish/vazifalar', label: 'Topshiriqlar' },
    { path: 'oqitish/tekshirish', label: 'Baholash', badge: badges.openAppeals }, { path: 'oqitish/oquvchilar', label: 'O‘quvchilar' },
  ] }); else groups.push({ label: 'O‘rganish', items: [
    { path: 'oquvchi/uy', label: 'Ish stoli' }, { path: 'oquvchi/darslar', label: 'Darslar' },
    { path: 'oquvchi/vazifalar', label: 'Vazifalar' }, { path: 'oquvchi/natijalar', label: 'Natijalar' },
    { path: 'oquvchi/organish', label: 'Mashq va takrorlash' },
  ] });
  if (role !== 'student' && classes.length) groups.push({ label: 'Sinflar', items: classes.map((item) => ({ path: `oqitish/sinf?id=${item.id}`, label: item.name })) });
  return groups;
}

const NAV_ICONS: Array<[RegExp, ComponentType<IconProps>]> = [
  [/holat|\/uy$/, House], [/darslar|organish$/, BookOpenText], [/savol-banki/, FolderOpen], [/tanlovlar/, ListChecks],
  [/vazifalar/, ClipboardText], [/tekshirish/, CheckSquare], [/oquvchilar|odamlar/, UsersThree], [/korpus/, Archive], [/sifat/, ChartBar], [/tizim/, GearSix],
];
const iconFor = (path: string) => NAV_ICONS.find(([pattern]) => pattern.test(path))?.[1] ?? SquaresFour;

export function AppShell({ user, route, groups, onLogout, children }: { user: User; route: Route; groups: NavGroup[]; onLogout: () => void; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [route.path]);
  // The class switcher is contextual navigation, not permanent chrome. Keeping
  // it open on every route steals 232px from question banks and lesson pages.
  const classGroup = route.page === 'sinf'
    ? groups.find((group) => group.label === 'Sinflar')
    : undefined;
  const primaryGroups = groups.filter((group) => group.label !== 'Sinflar');
  const activeClassId = route.params.get('id') ?? route.params.get('sinf');
  const roleLabel = user.role === 'owner' ? 'Administrator' : user.role === 'teacher' ? 'O‘qituvchi' : 'O‘quvchi';
  const today = useMemo(() => {
    const date = new Date();
    const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
    const days = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
    return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()} · ${days[date.getDay()]}`;
  }, []);
  const pageTitle = route.page === 'holat' || route.page === 'uy' ? 'Ish stoli' : primaryGroups.flatMap((g) => g.items).find((i) => route.path === i.path)?.label ?? 'CamPath';

  return <div className={`shell${classGroup ? ' shell--with-context' : ''}`}>
    <a className="shell-skip" href="#main">Asosiy qismga o‘tish</a>
    <nav className={`shell-rail${menuOpen ? ' is-open' : ''}`} aria-label="Asosiy navigatsiya">
      <div className="shell-primary">
        <div className="shell-brand"><span className="shell-mark" aria-hidden="true" /><span>CamPath<small>Cambridge 9618</small></span></div>
        <div className="shell-nav-groups">{primaryGroups.map((group) => <div className="shell-group" key={group.label}>
          <p className="shell-group-label">{group.label}</p>{group.items.map((item) => { const active = route.path === item.path || route.path === item.path.split('?')[0]; const Icon = iconFor(item.path); return <a key={item.path} href={`#${item.path}`} aria-current={active ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate(item.path); }}>
            <Icon size={20} weight={active ? 'fill' : 'regular'} aria-hidden="true" /><span>{item.label}</span>{item.badge ? <b className="shell-badge">{item.badge}</b> : null}
          </a>; })}
        </div>)}</div>
        <div className="shell-support"><a href="#yordam"><Question size={20} aria-hidden="true" /><span>Yordam</span></a><button type="button" onClick={onLogout}><SignOut size={20} aria-hidden="true" /><span>Chiqish</span></button></div>
        <button type="button" className="shell-account" aria-label="Profil menyusi"><span className="shell-avatar" aria-hidden="true">{user.fullName.split(/\s+/).map((n) => n[0]).slice(0, 2).join('')}</span><span><strong>{user.fullName}</strong><small>{roleLabel}</small></span><CaretDown size={14} aria-hidden="true" /></button>
      </div>
      {classGroup ? <aside className="shell-context" aria-label="Sinflar"><div className="shell-context-head"><strong>Sinflaringiz</strong><button type="button" aria-label="Yangi sinf" onClick={() => navigate('oqitish/sinf')}>+</button></div>
        <div className="shell-class-list">{classGroup.items.map((item, index) => { const id = new URLSearchParams(item.path.split('?')[1]).get('id'); const active = id === activeClassId; return <a key={item.path} href={`#${item.path}`} aria-current={active ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate(item.path); }}><span><strong>{item.label}</strong><small>{index % 2 ? 'A Level' : 'AS Level'}</small></span><i className={`shell-status shell-status--${index % 4}`} aria-hidden="true" /></a>; })}</div>
        <button type="button" className="shell-archive" onClick={() => navigate('oqitish/sinf')}><Archive size={18} /> Arxivlangan sinflar</button>
      </aside> : null}
    </nav>
    <div className="shell-body"><header className="shell-top"><button type="button" className="shell-burger" aria-expanded={menuOpen} aria-label="Menyu" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={21} /> : <CirclesFour size={21} />}</button><div className="shell-page-title">{pageTitle}</div><time dateTime={new Date().toISOString().slice(0, 10)}>{today}</time><ThemeToggle /></header><main id="main" className="shell-main">{children}</main></div>
    {menuOpen ? <button type="button" className="shell-scrim" aria-label="Menyuni yopish" onClick={() => setMenuOpen(false)} /> : null}
  </div>;
}
