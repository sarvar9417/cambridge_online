import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { QuestionBankPage } from './QuestionBankPage';
import './styles.css';

function Root() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    const onNavigationClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest('a');
      // The legacy monolithic App renders this sidebar item without an href.
      // Keep App untouched while Question Bank v2 is developed in isolation.
      if (target?.textContent?.trim() === 'Savol banki' && !target.getAttribute('href')) {
        event.preventDefault();
        window.location.hash = 'question-bank';
      }
    };
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('click', onNavigationClick);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('click', onNavigationClick);
    };
  }, []);

  return hash.startsWith('#question-bank') ? <QuestionBankPage /> : <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
