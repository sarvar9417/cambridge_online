import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { QuestionBankPage } from './QuestionBankPage';
import { SelectionHandoffPage } from './SelectionHandoffPage';
import { applyStoredTheme } from './lib/theme';
import { useRoute } from './lib/router';
import './theme.css';
import './styles.css';

function Root() {
  const route = useRoute();

  useEffect(() => {
    /*
     * Two bridges remain while the question bank is still a standalone page
     * with its own chrome. Both live inside QuestionBankPage's markup, so they
     * cannot be replaced by a real link until that page joins the shell.
     *
     * The third bridge -- matching a sidebar link by its text content -- is
     * gone: the rail now renders real hrefs.
     */
    const onClick = (event: MouseEvent) => {
      const element = event.target as HTMLElement | null;
      const button = element?.closest('button');
      if (!button) return;

      // Capture the active basket before React switches to the review step.
      if (button.textContent?.trim() === 'Ko‘rib chiqish') {
        const selected = document.querySelector<HTMLSelectElement>('.qb-basket-select')?.value;
        if (selected) sessionStorage.setItem('campath:question-bank-selection', selected);
        return;
      }

      if (button.textContent?.trim() === 'Assignment/PDF ga tayyor' && !button.disabled) {
        if (sessionStorage.getItem('campath:question-bank-selection')) {
          event.preventDefault();
          window.location.hash = 'oqitish/tanlovlar';
        }
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // The two hyphenated forms are the old bookmarks. They still work, because a
  // teacher who saved one should not meet a blank page after a rename.
  const path = route.path;
  if (path === 'oqitish/tanlovlar' || path.startsWith('question-bank-handoff')) {
    return <SelectionHandoffPage />;
  }
  if (path === 'oqitish/savol-banki' || path.startsWith('question-bank')) {
    return <QuestionBankPage />;
  }
  return <App />;
}

// Before the first paint: a dark-mode user must not see a white flash.
applyStoredTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
