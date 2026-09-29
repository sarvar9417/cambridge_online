import { useEffect, useState } from 'react';

/**
 * Hash routing, deliberately.
 *
 * The app is served as a static bundle behind one Vercel rewrite, so a path
 * route only works if every unknown path rewrites to index.html. The hash needs
 * no server cooperation and cannot 404 on a refresh, which matters here because
 * the first thing a teacher does with a useful screen is bookmark it.
 *
 * There is no router library: five routes do not justify a dependency, and the
 * previous "navigation" matched on a button's text content, which this replaces.
 */
export type Surface = 'boshqaruv' | 'oqitish' | 'oquvchi';

export interface Route {
  /** Everything before any '?', without the leading '#'. */
  path: string;
  /** First segment, naming the surface. */
  surface: string;
  /** Second segment, naming the page within it. */
  page: string;
  params: URLSearchParams;
}

export const HOME_BY_ROLE: Record<'owner' | 'teacher' | 'student', string> = {
  owner: 'boshqaruv/holat',
  teacher: 'oqitish/savol-banki',
  student: 'oquvchi/uy',
};

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const [surface = '', page = ''] = path.split('/');
  return { path, surface, page, params: new URLSearchParams(query) };
}

const PAGES_BY_SURFACE = {
  boshqaruv: new Set(['holat', 'odamlar', 'korpus', 'sifat', 'tizim']),
  oqitish: new Set(['darslar', 'savol-banki', 'live', 'tanlovlar', 'vazifalar', 'tekshirish', 'oquvchilar', 'sinf']),
  oquvchi: new Set(['uy', 'darslar', 'live', 'vazifalar', 'natijalar', 'organish']),
};

export function canAccessRoute(role: keyof typeof HOME_BY_ROLE, route: Route): boolean {
  const { surface, page, path } = route;
  if (path !== `${surface}/${page}`) return false;
  if (surface === 'boshqaruv') return role === 'owner' && PAGES_BY_SURFACE.boshqaruv.has(page);
  if (surface === 'oqitish') return role !== 'student' && PAGES_BY_SURFACE.oqitish.has(page);
  if (surface === 'oquvchi') return role === 'student' && PAGES_BY_SURFACE.oquvchi.has(page);
  return false;
}

export function navigate(path: string) {
  // Assigning to location.hash fires hashchange, which is what every listener
  // is already waiting on -- pushState would not.
  window.location.hash = path.startsWith('#') ? path.slice(1) : path;
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash));
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return parseRoute(hash);
}
