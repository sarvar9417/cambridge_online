import { CHAPTER_7_SOURCE_PAGE_AUDIT } from './chapter7-source-page-audit';
import { getChapter7SourceTranscript } from './chapter7-source-transcript';
import './chapter7-source-transcript.css';

export const getChapter7SourcePagesForSlide = (slideId: string) =>
  CHAPTER_7_SOURCE_PAGE_AUDIT
    .filter((page) => page.targetSlideIds.includes(slideId))
    .map((page) => page.printedPage);

export function Chapter7SourceTranscriptPanel({ slideId }: { slideId: string }) {
  if (!slideId.startsWith('ch7-book-')) return null;

  const pages = getChapter7SourcePagesForSlide(slideId)
    .map(getChapter7SourceTranscript)
    .filter((page): page is NonNullable<ReturnType<typeof getChapter7SourceTranscript>> => Boolean(page));

  if (!pages.length) return null;

  return (
    <details className="ch7-source-transcript">
      <summary>
        <span>BOOK SOURCE</span>
        <strong>{pages.map((page) => `p.${page.printedPage}`).join(' · ')}</strong>
        <small>Full extracted source text</small>
      </summary>
      <div className="ch7-source-transcript-pages">
        {pages.map((page) => (
          <article key={page.printedPage}>
            <header>
              <b>Source page {page.printedPage}</b>
              <code>{page.sha256.slice(0, 12)}</code>
            </header>
            <pre>{page.text}</pre>
          </article>
        ))}
      </div>
    </details>
  );
}
