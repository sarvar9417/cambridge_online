import { useEffect, useMemo, useRef, useState } from 'react';
import { api, apiBlob, type User } from './lib/api';
import { navigate, useRoute } from './lib/router';
import './question-bank.css';

type SelectionRole = 'graded' | 'context_only';
type BankView = 'parts' | 'families';

type Dependency = {
  id: string;
  questionId: string;
  dependsOnId: string;
  displayRef: string;
  stem: string | null;
  kind: 'text_ref' | 'answer_ref';
  strength: 'required' | 'context_only';
  evidence: string | null;
  confidence: number | null;
};

type PortableAsset = {
  id: string;
  kind: string;
  storagePath: string | null;
  contentMd: string | null;
  altText: string;
  sortOrder: number;
  sourcePage: number | null;
};

type PortableQuestion = {
  leaf: {
    id: string;
    rootId: string;
    label: string;
    path: string;
    displayRef: string;
    stem: string;
    commandWord: string | null;
    marks: number;
    answerKind: string;
    answerLines: number | null;
  };
  chain: Array<{ id: string; label: string; depth: number }>;
  contextBlocks: Array<{
    id: string;
    label: string;
    displayRef: string;
    depth: number;
    context: string | null;
    assets: PortableAsset[];
  }>;
  dependencies: Dependency[];
  sourceRef: string;
};

type Part = {
  id: string;
  rootId: string;
  rootRef: string;
  displayRef: string;
  stem: string;
  stemMd?: string;
  commandWord: string | null;
  marks: number;
  ao: string | null;
  answerKind: string;
  component: number;
  year: number;
  series: string;
  variant: number;
  status: string;
  hasDiagram: boolean;
  hasDependency: boolean;
  subtopics: Array<{ id: string; code: string; title: string }>;
  matches?: boolean;
};

type Family = {
  rootId: string;
  rootRef: string;
  matchCount: number;
  totalCount: number;
  parts: Part[];
};

type QuestionResponse = {
  data: Part[] | Family[];
  view: BankView;
  unavailableFilters: string[];
  nextCursor: null;
};

type FilterOptions = {
  topics: Array<{
    topic_id: string;
    topic_number: number;
    topic_title: string;
    subtopic_id: string;
    code: string;
    subtopic_title: string;
    component: number | null;
  }>;
  classes: Array<{ id: string; name: string }>;
};

type SelectionSummary = {
  id: string;
  name: string;
  item_count: number;
  total_marks: number;
};

type SelectionIssue = {
  code: 'answer_dependency_requires_graded' | 'required_text_dependency_missing' | 'optional_text_dependency_missing';
  severity: 'error' | 'warning';
  questionId: string;
  questionRef: string;
  dependsOnId: string;
  dependsOnRef: string;
  evidence: string | null;
};

type ReviewItem = {
  id: string;
  role: SelectionRole;
  sortOrder: number;
  sourceRef: string;
  freshRef: string;
  effectiveMarks: number;
  portable: PortableQuestion;
};

type SelectionReview = {
  items: ReviewItem[];
  totalMarks: number;
  dependencyIssues: SelectionIssue[];
  canPublish: boolean;
};

type ExportItem = {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  kind: string;
  file_format?: 'pdf' | 'docx';
};

const COMMAND_WORDS = [
  'State', 'Give', 'Name', 'Identify', 'Define', 'Describe', 'Explain', 'Compare',
  'Calculate', 'Complete', 'Draw', 'Write', 'Evaluate', 'Justify', 'Suggest', 'Show', 'Other',
];

const seriesLabels: Record<string, string> = { FM: 'Feb / Mar', MJ: 'May / Jun', ON: 'Oct / Nov' };
const seriesLabel = (series: string) => seriesLabels[series] ?? series;
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function retry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(400 * (attempt + 1));
    }
  }
  throw lastError;
}

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function QuestionBankPage({ user }: { user: User }) {
  const forClass = useRoute().params.get('sinf') ?? '';
  const searchRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<BankView>('parts');
  const [questions, setQuestions] = useState<QuestionResponse>({ data: [], view: 'parts', unavailableFilters: [], nextCursor: null });
  const [options, setOptions] = useState<FilterOptions>({ topics: [], classes: [] });
  const [selections, setSelections] = useState<SelectionSummary[]>([]);
  const [selectionId, setSelectionId] = useState('');
  const [review, setReview] = useState<SelectionReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [preview, setPreview] = useState<PortableQuestion | null>(null);
  const [dependencyDialog, setDependencyDialog] = useState<Dependency[] | null>(null);
  const [focused, setFocused] = useState(0);

  const [query, setQuery] = useState('');
  const [component, setComponent] = useState('');
  const [marksMin, setMarksMin] = useState('');
  const [marksMax, setMarksMax] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [series, setSeries] = useState<string[]>([]);
  const [aos, setAos] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [subtopicIds, setSubtopicIds] = useState<string[]>([]);
  const [commandWords, setCommandWords] = useState<string[]>([]);
  const [hasDiagram, setHasDiagram] = useState('');
  const [dependency, setDependency] = useState<'any' | 'independent'>('any');
  const [status, setStatus] = useState('');

  const loadOptions = async () => {
    const [filterResult, basketResult] = await Promise.allSettled([
      retry(() => api<FilterOptions>('/questions/filter-options')),
      retry(() => api<SelectionSummary[]>('/selections')),
    ]);

    if (filterResult.status === 'fulfilled') setOptions(filterResult.value);
    if (basketResult.status === 'fulfilled') {
      setSelections(basketResult.value);
      setSelectionId((current) => current || basketResult.value[0]?.id || '');
    }

    const failed = [filterResult, basketResult].find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failed) throw failed.reason;
  };

  useEffect(() => {
    if (!user || user.role === 'student') return;
    void loadOptions().catch((cause) => setError(message(cause, 'Savol banki sozlamalari yuklanmadi.')));
  }, [user]);

  const params = useMemo(() => {
    const value = new URLSearchParams({ view, dependency, limit: '120' });
    if (query.trim()) value.set('q', query.trim());
    if (component) value.set('component', component);
    if (marksMin) value.set('marksMin', marksMin);
    if (marksMax) value.set('marksMax', marksMax);
    if (yearFrom) value.set('yearFrom', yearFrom);
    if (yearTo) value.set('yearTo', yearTo);
    if (hasDiagram) value.set('hasDiagram', hasDiagram);
    if (status) value.set('status', status);
    series.forEach((item) => value.append('series', item));
    aos.forEach((item) => value.append('aos', item));
    topicIds.forEach((item) => value.append('topicIds', item));
    subtopicIds.forEach((item) => value.append('subtopicIds', item));
    commandWords.forEach((item) => value.append('commandWords', item));
    return value.toString();
  }, [view, dependency, query, component, marksMin, marksMax, yearFrom, yearTo, hasDiagram, status, series, aos, topicIds, subtopicIds, commandWords]);

  useEffect(() => {
    if (!user || user.role === 'student') return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      api<QuestionResponse>(`/questions?${params}`)
        .then((data) => {
          setQuestions(data);
          setFocused(0);
        })
        .catch((cause) => setError(message(cause, 'Savollar yuklanmadi.')))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [user, params]);

  const loadReview = async (id = selectionId) => {
    if (!id) {
      setReview(null);
      return;
    }
    setReview(await api<SelectionReview>(`/selections/${id}`));
  };

  useEffect(() => {
    if (!selectionId || !user || user.role === 'student') {
      setReview(null);
      return;
    }
    void loadReview(selectionId).catch((cause) => setError(message(cause, 'Savatcha yuklanmadi.')));
  }, [selectionId, user]);

  const refreshSelections = async () => {
    const data = await api<SelectionSummary[]>('/selections');
    setSelections(data);
  };

  const createSelection = async () => {
    const name = window.prompt('Yangi savatcha nomi', 'Yangi savollar to‘plami');
    if (!name?.trim()) return '';
    const created = await api<SelectionSummary>('/selections', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
    });
    setSelectionId(created.id);
    await refreshSelections();
    return created.id;
  };

  const ensureSelection = async () => selectionId || createSelection();

  const addQuestion = async (questionId: string, role: SelectionRole = 'graded') => {
    try {
      const id = await ensureSelection();
      if (!id) return;
      const result = await api<{ dependencies: Dependency[] }>(`/selections/${id}/items`, {
        method: 'POST',
        body: JSON.stringify({ questionId, role }),
      });
      await Promise.all([loadReview(id), refreshSelections()]);
      if (result.dependencies.length) setDependencyDialog(result.dependencies);
    } catch (cause) {
      setError(message(cause, 'Savol savatchaga qo‘shilmadi.'));
    }
  };

  const changeRole = async (itemId: string, role: SelectionRole) => {
    if (!selectionId) return;
    try {
      await api(`/selections/${selectionId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await Promise.all([loadReview(), refreshSelections()]);
    } catch (cause) {
      setError(message(cause, 'Savol roli o‘zgarmadi.'));
    }
  };

  const removeItem = async (itemId: string) => {
    if (!selectionId) return;
    try {
      await api(`/selections/${selectionId}/items/${itemId}`, { method: 'DELETE' });
      await Promise.all([loadReview(), refreshSelections()]);
    } catch (cause) {
      setError(message(cause, 'Savol savatchadan olinmadi.'));
    }
  };

  const openPreview = async (questionId: string) => {
    try {
      setPreview(await api<PortableQuestion>(`/questions/${questionId}/portable`));
    } catch (cause) {
      setError(message(cause, 'Kontekst yuklanmadi.'));
    }
  };

  const flat = view === 'parts'
    ? (questions.data as Part[])
    : (questions.data as Family[]).flatMap((family) => family.parts.filter((part) => part.matches));

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (editing || reviewing || preview || dependencyDialog) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setFocused((current) => Math.max(0, Math.min(flat.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))));
      }
      if ((event.key === 'Enter' || event.key === ' ') && flat[focused]) {
        event.preventDefault();
        void addQuestion(flat[focused].id);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [flat, focused, reviewing, preview, dependencyDialog, selectionId]);

  const topicChoices = [...new Map(options.topics.map((item) => [item.topic_id, item])).values()];
  const visibleSubtopics = options.topics.filter((item) => !topicIds.length || topicIds.includes(item.topic_id));

  const resetFilters = () => {
    setQuery('');
    setComponent('');
    setMarksMin('');
    setMarksMax('');
    setYearFrom('');
    setYearTo('');
    setSeries([]);
    setAos([]);
    setTopicIds([]);
    setSubtopicIds([]);
    setCommandWords([]);
    setHasDiagram('');
    setDependency('any');
    setStatus('');
  };

  if (user.role === 'student') {
    return <main className="qb-auth-state"><h1>Savol banki</h1><p>Bu ish maydoni o‘qituvchi va owner uchun.</p></main>;
  }

  if (reviewing && review) {
    return <ReviewScreen review={review} selectionId={selectionId} forClass={forClass} onBack={() => setReviewing(false)} />;
  }

  return (
    <main className="qb-page">
      <header className="qb-topbar">
        <div className="qb-topbar-left">
          <button className="qb-icon-button" title="Dashboardga qaytish" onClick={() => { window.location.hash = ''; }}>←</button>
          <div><strong>CamPath</strong><span>Question Bank v2</span></div>
        </div>
        <div className="qb-topbar-center"><span className="qb-badge qb-badge-primary">Cambridge 9618</span><span className="qb-badge">Leaf-first</span></div>
      </header>

      <div className="qb-layout">
        <aside className="qb-filters">
          <div className="qb-panel-title"><div><strong>Filtrlar</strong><small>Imtihon bankini toraytiring</small></div><button className="qb-link-button" onClick={resetFilters}>Tozalash</button></div>
          <Filter label="Komponent"><select value={component} onChange={(event) => setComponent(event.target.value)}><option value="">Barchasi</option>{[1, 2, 3, 4].map((item) => <option key={item} value={item}>Paper {item}</option>)}</select></Filter>
          <CheckGroup label="Mavzu" options={topicChoices.map((item) => [item.topic_id, `${item.topic_number}. ${item.topic_title}`])} value={topicIds} onChange={(next) => { setTopicIds(next); setSubtopicIds((current) => current.filter((id) => options.topics.some((item) => item.subtopic_id === id && (!next.length || next.includes(item.topic_id))))); }} maxHeight />
          <CheckGroup label="Kichik mavzu" options={visibleSubtopics.map((item) => [item.subtopic_id, `${item.code} ${item.subtopic_title}`])} value={subtopicIds} onChange={setSubtopicIds} maxHeight />
          <Filter label="Ball"><div className="qb-two-fields"><input type="number" min="0" placeholder="dan" value={marksMin} onChange={(event) => setMarksMin(event.target.value)} /><input type="number" min="0" placeholder="gacha" value={marksMax} onChange={(event) => setMarksMax(event.target.value)} /></div></Filter>
          <Filter label="Yil"><div className="qb-two-fields"><input type="number" min="2000" placeholder="dan" value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} /><input type="number" min="2000" placeholder="gacha" value={yearTo} onChange={(event) => setYearTo(event.target.value)} /></div></Filter>
          <CheckGroup label="Sessiya" options={Object.entries(seriesLabels)} value={series} onChange={setSeries} />
          <CheckGroup label="Assessment Objective" options={['AO1', 'AO2', 'AO3'].map((item) => [item, item])} value={aos} onChange={setAos} />
          <Filter label="Diagramma / rasm"><select value={hasDiagram} onChange={(event) => setHasDiagram(event.target.value)}><option value="">Barchasi</option><option value="true">Bor</option><option value="false">Yo‘q</option></select></Filter>
          <Filter label="Bog‘liqlik"><select value={dependency} onChange={(event) => setDependency(event.target.value as 'any' | 'independent')}><option value="any">Barchasi</option><option value="independent">Mustaqil savollar</option></select></Filter>
          {user.role === 'owner' && <Filter label="Review holati"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Barchasi (approved + review)</option><option value="approved">Tasdiqlangan</option><option value="needs_review">Topic tekshiruvda</option><option value="draft">Qoralama</option><option value="rejected">Rad etilgan</option><option value="archived">Arxivlangan</option></select></Filter>}
        </aside>

        <section className="qb-results">
          <div className="qb-search-row"><label className="qb-search"><span>⌕</span><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Savol matnidan qidiring…  /" /></label><div className="qb-segments" aria-label="Savol ko‘rinishi"><button className={view === 'parts' ? 'active' : ''} onClick={() => setView('parts')}>Qismlar</button><button className={view === 'families' ? 'active' : ''} onClick={() => setView('families')}>Oilalar</button></div></div>
          <div className="qb-result-meta"><div><strong>{view === 'parts' ? (questions.data as Part[]).length : (questions.data as Family[]).length}</strong><span>{view === 'parts' ? ' mos subpart' : ' savol oilasi'}</span></div><small>↑↓ tanlash · Enter savatchaga qo‘shish</small></div>
          {questions.unavailableFilters.length > 0 && <div className="qb-notice">Hozircha ishlamaydigan filtrlar: {questions.unavailableFilters.join(', ')}</div>}
          {error && <div className="qb-error">{error}</div>}
          {loading && <div className="qb-loading">Savollar yuklanmoqda…</div>}
          {!loading && view === 'parts' && <div className="qb-card-list">{(questions.data as Part[]).map((part, index) => <PartCard key={part.id} part={part} focused={focused === index} onAdd={() => void addQuestion(part.id)} onPreview={() => void openPreview(part.id)} />)}</div>}
          {!loading && view === 'families' && <div className="qb-card-list">{(questions.data as Family[]).map((family) => <FamilyCard key={family.rootId} family={family} onAdd={(id) => void addQuestion(id)} onPreview={(id) => void openPreview(id)} />)}</div>}
          {!loading && questions.data.length === 0 && <div className="qb-empty"><strong>Savol topilmadi</strong><span>Filtrlarni yumshatib ko‘ring.</span></div>}
        </section>

        <aside className="qb-basket">
          <div className="qb-panel-title"><div><strong>Savatcha</strong><small>Serverda saqlanadi</small></div><button className="qb-icon-button" title="Yangi savatcha" onClick={() => void createSelection()}>+</button></div>
          <select className="qb-basket-select" value={selectionId} onChange={(event) => setSelectionId(event.target.value)}><option value="">Savatchani tanlang</option>{selections.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.item_count} ta · {item.total_marks} ball</option>)}</select>
          <div className="qb-basket-items">
            {review?.items.map((item) => <article className="qb-basket-item" key={item.id}><div className="qb-basket-item-head"><strong>{item.freshRef}</strong><button title="Olib tashlash" onClick={() => void removeItem(item.id)}>×</button></div><small>{item.sourceRef}</small><p>{item.portable.leaf.stem}</p><div className="qb-basket-item-footer"><select value={item.role} onChange={(event) => void changeRole(item.id, event.target.value as SelectionRole)}><option value="graded">Baholanadi · {item.portable.leaf.marks} ball</option><option value="context_only">Faqat kontekst · 0 ball</option></select><button className="qb-link-button" onClick={() => setPreview(item.portable)}>Ko‘rish</button></div></article>)}
            {selectionId && !review?.items.length && <div className="qb-empty small"><span>Savollarni + bilan qo‘shing.</span></div>}
            {!selectionId && <div className="qb-empty small"><span>Avval savatcha yarating.</span></div>}
          </div>
          {review?.dependencyIssues.length ? <div className="qb-issues">{review.dependencyIssues.map((issue, index) => <div className={`qb-issue ${issue.severity}`} key={`${issue.code}-${index}`}><strong>{issue.severity === 'error' ? '!' : 'i'} {issue.dependsOnRef}</strong><span>{issueLabel(issue)}</span></div>)}</div> : null}
          <div className="qb-basket-summary"><div><span>Tanlangan</span><strong>{review?.items.length ?? 0} ta</strong></div><div><span>Jami</span><strong>{review?.totalMarks ?? 0} ball</strong></div><div><span>Dependency</span><strong className={review?.canPublish === false ? 'qb-danger-text' : 'qb-success-text'}>{review?.canPublish === false ? 'Bloklangan' : 'Tayyor'}</strong></div><button disabled={!review?.items.length} onClick={() => setReviewing(true)}>Ko‘rib chiqish</button></div>
        </aside>
      </div>
      {preview && <PortableModal portable={preview} onClose={() => setPreview(null)} />}
      {dependencyDialog && <DependencyModal dependencies={dependencyDialog} onClose={() => setDependencyDialog(null)} onAdd={(id, role) => void addQuestion(id, role)} />}
    </main>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) { return <label className="qb-filter"><span>{label}</span>{children}</label>; }

function CheckGroup({ label, options, value, onChange, maxHeight = false }: { label: string; options: Array<[string, string]>; value: string[]; onChange: (value: string[]) => void; maxHeight?: boolean; }) {
  return <fieldset className={`qb-check-group ${maxHeight ? 'scroll' : ''}`}><legend>{label}</legend><div>{options.map(([id, text]) => <label key={id}><input type="checkbox" checked={value.includes(id)} onChange={(event) => onChange(event.target.checked ? [...value, id] : value.filter((item) => item !== id))} /><span>{text}</span></label>)}</div></fieldset>;
}

function PartCard({ part, focused, onAdd, onPreview }: { part: Part; focused: boolean; onAdd: () => void; onPreview: () => void }) {
  return <article className={`qb-question-card ${focused ? 'focused' : ''}`}><div className="qb-question-main"><div className="qb-meta-line"><strong>{part.displayRef}</strong><span>{part.year} {seriesLabel(part.series)}</span><span>Paper {part.component}{part.variant ? ` · V${part.variant}` : ''}</span>{part.ao && <span>{part.ao}</span>}{part.commandWord && <span>{part.commandWord}</span>}{part.status === 'needs_review' && <span className="qb-chip warning">Topic review</span>}{part.hasDiagram && <span className="qb-chip">Diagramma</span>}{part.hasDependency && <span className="qb-chip warning">Bog‘liq</span>}</div><p>{part.stem}</p>{part.subtopics?.length > 0 && <div className="qb-topic-tags">{part.subtopics.map((topic) => <span key={topic.id}>{topic.code} {topic.title}</span>)}</div>}</div><div className="qb-question-actions"><strong>{part.marks} ball</strong><button className="qb-secondary-button" onClick={onPreview}>Kontekst</button><button className="qb-add-button" title="Savatchaga qo‘shish" onClick={onAdd}>+</button></div></article>;
}

function FamilyCard({ family, onAdd, onPreview }: { family: Family; onAdd: (id: string) => void; onPreview: (id: string) => void }) {
  return <details className="qb-family" open><summary><div><strong>{family.rootRef}</strong><span>{family.totalCount} qismdan {family.matchCount} tasi filtrga mos</span></div><span>⌄</span></summary><div className="qb-family-parts">{family.parts.map((part) => <article className={part.matches ? 'match' : ''} key={part.id}><div><strong>{part.displayRef}</strong>{part.status === 'needs_review' && <span className="qb-chip warning">Topic review</span>}<p>{part.stem}</p></div><span>{part.marks} ball</span><button className="qb-link-button" onClick={() => onPreview(part.id)}>Kontekst</button><button className="qb-add-button" onClick={() => onAdd(part.id)}>+</button></article>)}</div></details>;
}

function ContextBlocks({ portable }: { portable: PortableQuestion }) {
  if (!portable.contextBlocks.length) return <div className="qb-no-context">Alohida shared context talab qilinmaydi.</div>;
  return <div className="qb-context-list">{portable.contextBlocks.map((block) => <section key={block.id}><div className="qb-context-head"><strong>{block.displayRef}</strong><span>Context</span></div>{block.context && <p>{block.context}</p>}{block.assets.map((asset) => <div className="qb-asset" key={asset.id}><strong>{asset.kind}</strong><span>{asset.altText || 'Savol asseti'}{asset.sourcePage ? ` · source page ${asset.sourcePage}` : ''}</span>{asset.contentMd && <pre>{asset.contentMd}</pre>}{!asset.contentMd && asset.storagePath && <small>Private storage asset: {asset.storagePath.split('/').pop()}</small>}</div>)}</section>)}</div>;
}

function PortableModal({ portable, onClose }: { portable: PortableQuestion; onClose: () => void }) {
  return <div className="qb-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="qb-modal qb-portable-modal" role="dialog" aria-modal="true" aria-labelledby="portable-title"><header><div><span className="qb-eyebrow">Portable question</span><h2 id="portable-title">{portable.sourceRef}</h2></div><button className="qb-icon-button" onClick={onClose}>×</button></header><div className="qb-chain">{portable.chain.map((node, index) => <span key={node.id}>{index ? '→' : ''} {node.label}</span>)}</div><ContextBlocks portable={portable} /><article className="qb-leaf-preview"><div><strong>{portable.leaf.displayRef}</strong><span>{portable.leaf.commandWord ?? '—'} · {portable.leaf.marks} ball</span></div><p>{portable.leaf.stem}</p></article>{portable.dependencies.length > 0 && <div className="qb-dependency-preview"><strong>Bog‘liqliklar</strong>{portable.dependencies.map((item) => <div key={item.id}><span className={`qb-chip ${item.kind === 'answer_ref' ? 'danger' : 'warning'}`}>{item.kind}</span><b>{item.displayRef}</b><span>{item.evidence ?? item.stem}</span></div>)}</div>}<footer><small>Original manba: {portable.sourceRef}</small><button onClick={onClose}>Yopish</button></footer></section></div>;
}

function DependencyModal({ dependencies, onClose, onAdd }: { dependencies: Dependency[]; onClose: () => void; onAdd: (id: string, role: SelectionRole) => void }) {
  return <div className="qb-modal-backdrop" role="presentation"><section className="qb-modal qb-dependency-modal" role="dialog" aria-modal="true" aria-labelledby="dependency-title"><header><div><span className="qb-eyebrow">Dependency check</span><h2 id="dependency-title">Oldingi qism kerak</h2></div><button className="qb-icon-button" onClick={onClose}>×</button></header><p className="qb-modal-intro">Tanlangan subpart boshqa qismdagi material yoki candidate javobiga tayanadi. To‘g‘ri prerequisite’ni qo‘shing.</p><div className="qb-dependency-list">{dependencies.map((item) => <article key={item.id}><div className="qb-meta-line"><strong>{item.displayRef}</strong><span className={`qb-chip ${item.kind === 'answer_ref' ? 'danger' : 'warning'}`}>{item.kind}</span><span>{item.strength}</span></div><p>{item.stem || item.evidence || 'Referenced part'}</p>{item.evidence && <blockquote>{item.evidence}</blockquote>}<div className="qb-modal-actions"><button onClick={() => onAdd(item.dependsOnId, 'graded')}>Baholanadigan qilib qo‘shish</button><button className="qb-secondary-button" disabled={item.kind === 'answer_ref'} title={item.kind === 'answer_ref' ? 'Candidate javobi kerak: prerequisite baholanadigan bo‘lishi shart.' : ''} onClick={() => onAdd(item.dependsOnId, 'context_only')}>Faqat kontekst</button></div></article>)}</div><footer><small>`answer_ref` faqat graded prerequisite bilan qondiriladi.</small><button className="qb-secondary-button" onClick={onClose}>Keyin hal qilaman</button></footer></section></div>;
}

function ReviewScreen({ review, selectionId, forClass, onBack }: { review: SelectionReview; selectionId: string; forClass: string; onBack: () => void }) {
  const [exporting, setExporting] = useState<'pdf' | 'docx' | ''>('');
  const [exportError, setExportError] = useState('');

  const exportSelection = async (format: 'pdf' | 'docx') => {
    if (!selectionId || !review.canPublish || exporting) return;
    setExporting(format);
    setExportError('');
    try {
      const exp = await api<ExportItem>('/exports', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ kind: 'question_paper', refTable: 'selections', refId: selectionId, format, title: 'Cambridge 9618 practice' }) });
      await api('/jobs/run-once', { method: 'POST' }).catch(() => null);
      let complete: ExportItem | null = null;
      for (let attempt = 0; attempt < 25; attempt++) {
        const current = await api<ExportItem>(`/exports/${exp.id}`);
        if (current.status === 'failed') throw new Error(current.error ?? 'Hujjat eksportida xato yuz berdi.');
        if (current.status === 'succeeded') { complete = current; break; }
        await sleep(1200);
      }
      if (!complete) throw new Error('Hujjat navbatda qoldi. Export sahifasidan holatini tekshiring.');
      const blob = await apiBlob(`/exports/${complete.id}/file`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `cambridge-9618-practice.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setExportError(message(cause, 'Hujjat yuklanmadi.'));
    } finally {
      setExporting('');
    }
  };

  return <main className="qb-review-page"><header className="qb-review-header"><button className="qb-secondary-button" onClick={onBack}>← Savol bankiga qaytish</button><div><strong>{review.items.length} qism</strong><span>{review.totalMarks} ball</span></div><span className={`qb-review-state ${review.canPublish ? 'ready' : 'blocked'}`}>{review.canPublish ? 'Eksportga tayyor' : 'Dependency bloklangan'}</span></header><div className="qb-review-layout"><section className="qb-review-paper"><div className="qb-paper-title"><span>CAMBRIDGE 9618 · GENERATED PRACTICE</span><h1>Savollar to‘plami</h1><small>Fresh numbering · original source references retained</small></div>{review.items.map((item) => <article className={`qb-review-question ${item.role === 'context_only' ? 'context-only' : ''}`} key={item.id}><div className="qb-review-question-head"><strong>{item.freshRef}</strong><span>{item.role === 'graded' ? `${item.effectiveMarks} ball` : 'Context only · 0 ball'}</span></div><ContextBlocks portable={item.portable} /><p className="qb-review-stem">{item.portable.leaf.stem}</p><footer>Manba: {item.sourceRef}</footer></article>)}</section><aside className="qb-review-side"><h2>Preflight</h2><div className="qb-review-stat"><span>Jami ball</span><strong>{review.totalMarks}</strong></div><div className="qb-review-stat"><span>Dependency issues</span><strong>{review.dependencyIssues.length}</strong></div>{review.dependencyIssues.map((issue, index) => <div className={`qb-issue ${issue.severity}`} key={`${issue.code}-${index}`}><strong>{issue.dependsOnRef}</strong><span>{issueLabel(issue)}</span>{issue.evidence && <small>{issue.evidence}</small>}</div>)}{!review.dependencyIssues.length && <div className="qb-success-box">✓ Barcha dependency qoidalari qondirilgan.</div>}<button disabled={!review.canPublish || !selectionId || Boolean(exporting)} onClick={() => void exportSelection('pdf')}>{exporting === 'pdf' ? 'PDF tayyorlanmoqda…' : 'Download PDF'}</button><button className="qb-secondary-button" disabled={!review.canPublish || !selectionId || Boolean(exporting)} onClick={() => void exportSelection('docx')}>{exporting === 'docx' ? 'Word tayyorlanmoqda…' : 'Download Word (.docx)'}</button><button className="qb-secondary-button" disabled={!review.canPublish || !selectionId || Boolean(exporting)} onClick={() => navigate(`oqitish/tanlovlar?id=${encodeURIComponent(selectionId)}${forClass ? `&sinf=${encodeURIComponent(forClass)}` : ''}`)}>Mark Scheme / Assignment →</button>{exportError && <div className="qb-error">{exportError}</div>}<small className="qb-muted">PDF va Word assignment yaratmasdan to‘g‘ridan-to‘g‘ri shu selection’dan olinadi.</small></aside></div></main>;
}

function issueLabel(issue: SelectionIssue) {
  if (issue.code === 'answer_dependency_requires_graded') return `${issue.questionRef} uchun ${issue.dependsOnRef} candidate javobi kerak — prerequisite graded bo‘lishi shart.`;
  if (issue.code === 'required_text_dependency_missing') return `${issue.questionRef} uchun ${issue.dependsOnRef} dagi printed material majburiy.`;
  return `${issue.dependsOnRef} konteksti foydali; qo‘shish tavsiya etiladi.`;
}
