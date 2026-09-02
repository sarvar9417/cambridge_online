import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyStoredTheme } from './lib/theme';
import { parseRoute } from './lib/router';
import './theme.css';
import './styles.css';
import './modern-ui.css';
import './dense-workspaces.css';

/** Bookmarks made before the routes were named. */
const RENAMED: Record<string, string> = {
  'question-bank-handoff': 'oqitish/tanlovlar',
  'question-bank': 'oqitish/savol-banki',
};

function Root() {
  useEffect(() => {
    // A teacher who bookmarked the old hash should land on the page, not on a
    // home screen wondering where it went.
    const redirect = () => {
      const { path } = parseRoute(window.location.hash);
      for (const [from, to] of Object.entries(RENAMED)) {
        if (path === from || path.startsWith(`${from}?`)) {
          window.location.replace(`#${to}`);
          return;
        }
      }
    };
    redirect();
    window.addEventListener('hashchange', redirect);
    return () => window.removeEventListener('hashchange', redirect);
  }, []);

  return <App />;
}

// Before the first paint: a dark-mode user must not see a white flash.
applyStoredTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
