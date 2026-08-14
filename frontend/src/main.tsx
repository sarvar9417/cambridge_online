import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// KaTeX ships its fonts as relative URLs next to the stylesheet; Vite inlines
// them at build time, so the page stays self-contained with no CDN request.
import 'katex/dist/katex.min.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
