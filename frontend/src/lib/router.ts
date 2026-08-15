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
