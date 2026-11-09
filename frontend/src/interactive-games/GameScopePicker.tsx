import { useState } from 'react';
import {
  normalizeGameScopes, selectWholeChapter, toggleNarrowScope,
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
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState('');
  const chapters = catalog.chapters.filter((chapter) =>
    !filter.trim() ||
    (chapter.chapterNo + ' ' + chapter.title + ' ' + chapter.topics.map((topic) => topic.title).join(' ') +
      ' ' + chapter.sections.map((section) => section.title).join(' '))
      .toLowerCase().includes(filter.trim().toLowerCase()));
  const full = new Set(scopes.filter((scope) => scope.kind === 'chapter').map((scope) => scope.chapterNo));
  const selectedChapters = new Set(scopes.map((scope) => scope.chapterNo));

  function wholeChapter(chapterNo: number, checked: boolean) {
    onChange(selectWholeChapter(scopes, chapterNo, checked));
  }
  function narrow(scope: GameScope, checked: boolean) {
    const next = toggleNarrowScope(scopes, scope, checked);
    if (next.length <= 100) onChange(next);
  }

  return <div className="ig-scope-picker">
    <div className="ig-scope-header">
      <div>
        <strong>Select chapters and topics</strong>
        <p>Combine several complete chapters or individual syllabus topics and Hodder sections in one game.</p>
      </div>
      <div className="ig-scope-summary" role="status">
        <strong>{selectedChapters.size}</strong> chapters · <strong>{scopes.length}</strong> selections
      </div>
    </div>
    <div className="ig-scope-toolbar">
      <label className="ig-scope-search">Search curriculum
        <input type="search" aria-label="Search chapters and topics" placeholder="Chapter, topic or section…" value={filter}
          onChange={(event) => setFilter(event.target.value)} />
      </label>
      <button type="button" disabled={disabled} onClick={() => {
        const all: GameScope[] = catalog.chapters.filter((chapter) => chapter.termCount > 0)
          .map((chapter) => ({ chapterNo: chapter.chapterNo, kind: 'chapter' }));
        onChange(normalizeGameScopes(all));
      }}>Select all chapters</button>
      <button type="button" disabled={disabled || !scopes.length} onClick={() => onChange([])}>Clear selection</button>
      <button type="button" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)}>
        {showAll ? 'Collapse details' : 'Expand details'}
      </button>
    </div>
    <div className="ig-scope-chapters">
      {chapters.map((chapter) => {
        const isFull = full.has(chapter.chapterNo);
        const included = scopes.filter((scope) => scope.chapterNo === chapter.chapterNo);
        return <div className={'ig-scope-chapter' + (included.length ? ' is-selected' : '')}
          key={chapter.chapterNo}>
          <div className="ig-scope-chapter-head">
            <label>
              <input type="checkbox" disabled={disabled} aria-label={'Select entire Chapter ' + chapter.chapterNo}
                checked={isFull} onChange={(event) => wholeChapter(chapter.chapterNo, event.target.checked)} />
              <strong>Chapter {chapter.chapterNo} · {chapter.title}</strong>
              <span>{chapter.termCount} terms</span>
            </label>
            <details className="ig-scope-details" open={showAll ? true : undefined}
              key={showAll ? 'expanded' : 'default-' + chapter.chapterNo}>
              <summary aria-label={'Choose topics and sections in Chapter ' + chapter.chapterNo}>
                {isFull ? 'Entire chapter ✓' : included.length ? included.length + ' selected' : 'Choose parts'}
              </summary>
              <div className="ig-scope-detail-content">
                {isFull && <p className="ig-scope-hint">Deselect the whole chapter to choose only some topics or sections.</p>}
                <strong>Syllabus topics</strong>
                <div className="ig-scope-subchoices">
                  {chapter.topics.length ? chapter.topics.map((topic) =>
                    <label key={'topic-' + topic.code}>
                      <input type="checkbox" disabled={disabled || isFull} aria-label={'Topic ' + topic.code + ' · Chapter ' + chapter.chapterNo}
                        checked={isFull || included.some((scope) => scope.kind === 'topic' && scope.code === topic.code)}
                        onChange={(event) => narrow({ chapterNo: chapter.chapterNo, kind: 'topic', code: topic.code }, event.target.checked)} />
                      <span>{topic.code} · {topic.title}</span>
                      <small>{topic.termCount}</small>
                    </label>,
                  ) : <p>No glossary-linked syllabus topics yet.</p>}
                </div>
                <strong>Hodder book sections</strong>
                <div className="ig-scope-subchoices">
                  {chapter.sections.length ? chapter.sections.map((section) =>
                    <label key={'section-' + section.code}>
                      <input type="checkbox" disabled={disabled || isFull}
                        aria-label={'Hodder section ' + section.code + ' · Chapter ' + chapter.chapterNo}
                        checked={isFull || included.some((scope) => scope.kind === 'section' && scope.code === section.code)}
                        onChange={(event) => narrow({ chapterNo: chapter.chapterNo, kind: 'section', code: section.code }, event.target.checked)} />
                      <span>{section.code} · {section.title}</span>
                      <small>{section.termCount}</small>
                    </label>,
                  ) : <p>No Hodder glossary links available yet.</p>}
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
    <p className="ig-scope-hint">Overlapping terms are counted once. New database imports appear after Refresh database.</p>
  </div>;
}
