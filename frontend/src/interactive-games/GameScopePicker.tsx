import { useState } from 'react';
import {
  normalizeGameScopes, selectWholeChapter, toggleNarrowScope, chapterMatchesGameSearch, visibleGameCatalogEntries,
  type GameScope, type LiveGameCatalog,
} from './remote-games';
import './game-scope-picker.css';

interface Props {
  catalog: LiveGameCatalog;
  scopes: GameScope[];
  onChange: (next: GameScope[]) => void;
  disabled?: boolean;
}

/** Choose whole chapters or specific syllabus topics and Hodder sections. */
export function GameScopePicker({ catalog, scopes, onChange, disabled = false }: Props) {
  const [expanded, setExpanded] = useState(() => new Set(scopes.map((scope) => scope.chapterNo)));
  const [filter, setFilter] = useState('');
  const chapters = catalog.chapters.filter((chapter) => chapterMatchesGameSearch(chapter, filter));
  const full = new Set(scopes.filter((scope) => scope.kind === 'chapter').map((scope) => scope.chapterNo));
  const selectedChapters = new Set(scopes.map((scope) => scope.chapterNo));
  const allExpanded = chapters.length > 0 && chapters.every((chapter) => expanded.has(chapter.chapterNo));

  function wholeChapter(chapterNo: number, checked: boolean) {
    if (checked) setExpanded((previous) => new Set([...previous, chapterNo]));
    onChange(selectWholeChapter(scopes, chapterNo, checked));
  }
  function narrow(scope: GameScope, checked: boolean) {
    const next = toggleNarrowScope(scopes, scope, checked);
    if (next.length <= 100) onChange(next);
  }

  return <div className="ig-scope-picker">
    <div className="ig-scope-header">
      <div>
        <strong>Select chapters and curriculum sections</strong>
        <p>Choose whole chapters, broad Cambridge syllabus subtopics or specific Hodder coursebook sections. The same printed code can mean different coverage in the two sources.</p>
      </div>
      <div className="ig-scope-summary" role="status">
        <strong>{selectedChapters.size}</strong> chapters · <strong>{scopes.length}</strong> selections
      </div>
    </div>
    <div className="ig-scope-toolbar">
      <label className="ig-scope-search">Search curriculum
        <input type="search" aria-label="Search chapters and topics" placeholder="Chapter, topic or section…" value={filter}
          onChange={(event) => {
            const next = event.target.value;
            setFilter(next);
            if (next.trim()) {
              const matches = catalog.chapters.filter((chapter) => chapterMatchesGameSearch(chapter, next));
              setExpanded((current) => new Set([...current, ...matches.map((chapter) => chapter.chapterNo)]));
            }
          }} />
      </label>
      <button type="button" disabled={disabled} onClick={() => {
        const all: GameScope[] = catalog.chapters.filter((chapter) => chapter.termCount > 0)
          .map((chapter) => ({ chapterNo: chapter.chapterNo, kind: 'chapter' }));
        onChange(normalizeGameScopes(all));
      }}>Select all chapters</button>
      <button type="button" disabled={disabled || !scopes.length} onClick={() => onChange([])}>Clear selection</button>
      <button type="button" disabled={!chapters.length} aria-expanded={allExpanded} onClick={() =>
        setExpanded(allExpanded ? new Set() : new Set(chapters.map((chapter) => chapter.chapterNo)))}>
        {allExpanded ? 'Collapse details' : 'Expand details'}
      </button>
    </div>
    <div className="ig-scope-chapters">
      {chapters.map((chapter) => {
        const isFull = full.has(chapter.chapterNo);
        const included = scopes.filter((scope) => scope.chapterNo === chapter.chapterNo);
        const visible = visibleGameCatalogEntries(chapter, filter);
        return <div className={'ig-scope-chapter' + (included.length ? ' is-selected' : '')}
          key={chapter.chapterNo}>
          <div className="ig-scope-chapter-head">
            <label>
              <input type="checkbox" disabled={disabled} aria-label={'Select entire Chapter ' + chapter.chapterNo}
                checked={isFull} onChange={(event) => wholeChapter(chapter.chapterNo, event.target.checked)} />
              <strong>Chapter {chapter.chapterNo} · {chapter.title}</strong>
              <span>{chapter.termCount} terms</span>
            </label>
            <details className="ig-scope-details" open={expanded.has(chapter.chapterNo)}>
              <summary onClick={(event) => {
                event.preventDefault();
                setExpanded((previous) => {
                  const next = new Set(previous);
                  if (next.has(chapter.chapterNo)) next.delete(chapter.chapterNo);
                  else next.add(chapter.chapterNo);
                  return next;
                });
              }}>Chapter {chapter.chapterNo}: {isFull ? 'Entire chapter · Refine selection' : included.length ? included.length + ' selected' : 'Choose sections'}</summary>
              <div className="ig-scope-detail-content">
                {isFull && <p className="ig-scope-hint">Choose a topic or section to narrow this chapter. Selections in other chapters stay selected.</p>}
                <strong>Syllabus topics (broad subtopics)</strong>
                <p className="ig-scope-explainer">These are Cambridge syllabus groupings. A code such as 17.1 may cover several different Hodder sections.</p>
                <div className="ig-scope-subchoices">
                  {visible.topics.length ? visible.topics.map((topic) =>
                    <label key={'topic-' + topic.code}>
                      <input type="checkbox" disabled={disabled} aria-label={'Topic ' + topic.code + ' · Chapter ' + chapter.chapterNo}
                        checked={included.some((scope) => scope.kind === 'topic' && scope.code === topic.code)}
                        onChange={(event) => narrow({ chapterNo: chapter.chapterNo, kind: 'topic', code: topic.code }, event.target.checked)} />
                      <span>{topic.code} · {topic.title}</span>
                      <small>{topic.termCount}</small>
                    </label>,
                  ) : <p>{filter.trim() ? 'No syllabus subtopic matches this search.' : 'No glossary-linked syllabus topics yet.'}</p>}
                </div>
                <strong>Hodder book sections (precise book structure)</strong>
                <p className="ig-scope-explainer">Book section codes follow the Hodder chapter outline; parent sections include their child sections. The root book chapter is selected using the Chapter checkbox above.</p>
                <div className="ig-scope-subchoices">
                  {visible.sections.length ? visible.sections.map((section) =>
                    <label key={'section-' + section.code} className={section.parentCode && section.parentCode !== String(chapter.chapterNo) ? 'ig-scope-book-child' : 'ig-scope-book-parent'}>
                      <input type="checkbox" disabled={disabled}
                        aria-label={'Hodder section ' + section.code + ' · Chapter ' + chapter.chapterNo}
                        checked={included.some((scope) => scope.kind === 'section' && scope.code === section.code)}
                        onChange={(event) => narrow({ chapterNo: chapter.chapterNo, kind: 'section', code: section.code }, event.target.checked)} />
                      <span>{section.code} · {section.title}</span>
                      <small>{section.termCount}{included.some((scope) =>
                        scope.kind === 'section' && Boolean(scope.code && section.code.startsWith(scope.code + '.')))
                        ? ' · included by selected parent' : ''}</small>
                    </label>,
                  ) : <p>{filter.trim() ? 'No Hodder section matches this search.' : 'No Hodder glossary links available yet.'}</p>}
                </div>
              </div>
            </details>
          </div>
        </div>;
      })}
    </div>
    {!chapters.length && <p className="ig-data-message">No matching chapters or topics. Clear the search to see available content.</p>}
    {!scopes.length && <p className="ig-scope-empty" role="status">Select at least one chapter, topic or section to create an Interactive Games round.</p>}
    {scopes.length >= 100 && <p className="ig-scope-empty">Maximum 100 individual selections. You can select an entire chapter instead.</p>}
    <p className="ig-scope-hint">Counts beside sections are linked glossary entries, not additive totals: parent and child selections overlap. Each glossary entry appears once in the combined bank. The same term can appear in different chapters with different definitions; scored games avoid ambiguous answers. New database imports appear after Refresh database.</p>
  </div>;
}
