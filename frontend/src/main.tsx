import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { QuestionBankPage } from './QuestionBankPage';
import { SelectionHandoffPage } from './SelectionHandoffPage';
import './styles.css';

function Root() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    const onNavigationClick = (event: MouseEvent) => {
      const element = event.target as HTMLElement | null;
      const anchor = element?.closest('a');
      const button = element?.closest('button');

      // The legacy monolithic App renders this sidebar item without an href.
      // Keep App untouched while Question Bank v2 is developed in isolation.
      if (anchor?.textContent?.trim() === 'Savol banki' && !anchor.getAttribute('href')) {
        event.preventDefault();
        window.location.hash = 'question-bank';
        return;
      }

      // Temporary bridge while QuestionBankPage remains an isolated feature.
      // Capture the active server-side basket before React switches to review.
      if (button?.textContent?.trim() === 'Ko‘rib chiqish') {
        const selected = document.querySelector<HTMLSelectElement>('.qb-basket-select')?.value;
        if (selected) sessionStorage.setItem('campath:question-bank-selection', selected);
        return;
      }

      if (button?.textContent?.trim() === 'Assignment/PDF ga tayyor' && !button.disabled) {
        const selectionId = sessionStorage.getItem('campath:question-bank-selection');
        if (selectionId) {
          event.preventDefault();
          window.location.hash = 'question-bank-handoff';
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('click', onNavigationClick);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('click', onNavigationClick);
    };
  }, []);

  if (hash.startsWith('#question-bank-handoff')) return <SelectionHandoffPage />;
  if (hash.startsWith('#question-bank')) return <QuestionBankPage />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
