import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyStoredTheme } from './lib/theme';
import { parseRoute } from './lib/router';
import { installQuestionStructureEnhancer } from './lib/question-structure-dom';
// The design tokens name Inter, Source Serif 4 and JetBrains Mono; shipping the
// fonts makes every operating system render the same product instead of
// falling back to whatever sans/serif/mono the machine happens to have.
import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/jetbrains-mono';
import './theme.css';
import './styles.css';
import './question-structure.css';

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

  useEffect(() => installQuestionStructureEnhancer(), []);

  return <App />;
}

// Before the first paint: a dark-mode user must not see a white flash.
applyStoredTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
