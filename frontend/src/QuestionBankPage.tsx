import { useEffect, useMemo, useRef, useState } from 'react';
import { CaretDown, CaretUp, Check, Funnel, MagnifyingGlass, PencilSimple, Plus, ShoppingCart, Trash, X } from '@phosphor-icons/react';
import { api, apiBlob, type User } from './lib/api';
import { navigate, useRoute } from './lib/router';
import './question-bank.css';

type SelectionRole = 'graded' | 'context_only';
type BankView = 'parts' | 'families';
type BankSort = 'relevance' | 'newest' | 'marks_asc' | 'marks_desc';

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
  syllabusCode: string;
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
  syllabi: Array<{
    code: string;
    subject: string;
    valid_from: number;
    valid_to: number;
    is_active: boolean;
    question_count: number;
  }>;
  components: Array<{
    syllabus_code: string;
    number: number;
    name: string;
    level: string;
  }>;
  topics: Array<{
    syllabus_code: string;
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
  created_at?: string;
  updated_at?: string;
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
  const route = useRoute();
  const forClass = route.params.get('sinf') ?? '';
  const requestedSyllabus = route.params.get('syllabus') ?? '9618';
  const searchRef = useRef<HTMLInputElement>(null);
  const reviewRequestRef = useRef(0);
  const selectionStorageKey = `campath:question-bank:selection:${user.id}`;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<BankView>('parts');
  const [questions, setQuestions] = useState<QuestionResponse>({ data: [], view: 'parts', unavailableFilters: [], nextCursor: null });
  const [options, setOptions] = useState<FilterOptions>({ syllabi: [], components: [], topics: [], classes: [] });
  const [selections, setSelections] = useState<SelectionSummary[]>([]);
  const [selectionId, setSelectionId] = useState('');
  const [review, setReview] = useState<SelectionReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const [pendingQuestionIds, setPendingQuestionIds] = useState<Set<string>>(new Set());
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set());
  const [basketNotice, setBasketNotice] = useState('');
  const [lastRemoved, setLastRemoved] = useState<ReviewItem | null>(null);
  const [selectionDialog, setSelectionDialog] = useState<{ mode: 'create' | 'rename'; name: string; confirmDelete: boolean } | null>(null);
  const [queuedQuestion, setQueuedQuestion] = useState<{ id: string; role: SelectionRole } | null>(null);
  const [selectionSaving, setSelectionSaving] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<BankSort>('relevance');
  const [reviewing, setReviewing] = useState(false);
  const [preview, setPreview] = useState<PortableQuestion | null>(null);
  const [dependencyDialog, setDependencyDialog] = useState<Dependency[] | null>(null);
  const [focused, setFocused] = useState(0);

  const [query, setQuery] = useState('');
  const [syllabusCode, setSyllabusCode] = useState(requestedSyllabus);
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
  const [status, setStatus] = useState('approved');

  const loadOptions = async () => {
    const [filterResult, basketResult] = await Promise.allSettled([
      retry(() => api<FilterOptions>('/questions/filter-options')),
      retry(() => api<SelectionSummary[]>('/selections')),
    ]);

    if (filterResult.status === 'fulfilled') {
      setOptions(filterResult.value);
      setSyllabusCode((current) => filterResult.value.syllabi.some((item) => item.code === current)
        ? current
        : filterResult.value.syllabi[0]?.code ?? '');
    }
    if (basketResult.status === 'fulfilled') {
      setSelections(basketResult.value);
      setSelectionId((current) => {
        if (current && basketResult.value.some((item) => item.id === current)) return current;
        const saved = window.localStorage.getItem(selectionStorageKey);
        return basketResult.value.some((item) => item.id === saved) ? saved! : basketResult.value[0]?.id || '';
      });
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
    if (syllabusCode) value.set('syllabusCode', syllabusCode);
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
  }, [view, dependency, syllabusCode, query, component, marksMin, marksMax, yearFrom, yearTo, hasDiagram, status, series, aos, topicIds, subtopicIds, commandWords]);

  useEffect(() => {
    if (!user || user.role === 'student' || !syllabusCode) return;
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
  }, [user, syllabusCode, params]);

  const loadReview = async (id = selectionId) => {
    const request = ++reviewRequestRef.current;
    if (!id) {
      setReview(null);
      return;
    }
    setReviewLoading(true);
    try {
      const next = await api<SelectionReview>(`/selections/${id}`);
      if (request === reviewRequestRef.current) setReview(next);
    } finally {
      if (request === reviewRequestRef.current) setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (!selectionId || !user || user.role === 'student') {
      setReview(null);
      return;
    }
    void loadReview(selectionId).catch((cause) => setError(message(cause, 'Savatcha yuklanmadi.')));
  }, [selectionId, user]);

  useEffect(() => {
    if (selectionId) window.localStorage.setItem(selectionStorageKey, selectionId);
    else window.localStorage.removeItem(selectionStorageKey);
  }, [selectionId, selectionStorageKey]);

  const refreshSelections = async () => {
    const data = await api<SelectionSummary[]>('/selections');
    setSelections(data);
  };

  const createSelection = async (name?: string) => {
    if (!name?.trim()) {
      setSelectionDialog({ mode: 'create', name: 'Yangi savollar to‘plami', confirmDelete: false });
      return '';
    }
    const created = await api<SelectionSummary>('/selections', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
    setSelectionId(created.id);
    setReview(null);
    await refreshSelections();
    return created.id;
  };

  const saveSelectionDialog = async () => {
    if (!selectionDialog?.name.trim() || selectionSaving) return;
    setSelectionSaving(true);
    setError('');
    try {
      if (selectionDialog.mode === 'create') {
        const createdId = await createSelection(selectionDialog.name);
        if (createdId && queuedQuestion) {
          const result = await api<{ dependencies: Dependency[] }>(`/selections/${createdId}/items`, { method: 'POST', body: JSON.stringify({ questionId: queuedQuestion.id, role: queuedQuestion.role }) });
          setQueuedQuestion(null);
          await Promise.all([loadReview(createdId), refreshSelections()]);
          if (result.dependencies.length) setDependencyDialog(result.dependencies);
        }
      }
      else if (selectionId) {
        await api(`/selections/${selectionId}`, { method: 'PATCH', body: JSON.stringify({ name: selectionDialog.name.trim() }) });
        await refreshSelections();
      }
      setSelectionDialog(null);
      setBasketOpen(true);
    } catch (cause) {
      setError(message(cause, 'Savatcha saqlanmadi.'));
    } finally {
      setSelectionSaving(false);
    }
  };

  const deleteSelection = async () => {
    if (!selectionId || selectionSaving) return;
    setSelectionSaving(true);
    try {
      await api(`/selections/${selectionId}`, { method: 'DELETE' });
      const remaining = selections.filter((item) => item.id !== selectionId);
      setSelections(remaining);
      setSelectionId(remaining[0]?.id ?? '');
      setReview(null);
      setSelectionDialog(null);
      setBasketNotice('Savatcha o‘chirildi.');
    } catch (cause) {
      setError(message(cause, 'Savatcha o‘chirilmadi.'));
    } finally {
      setSelectionSaving(false);
    }
  };

  const addQuestion = async (questionId: string, role: SelectionRole = 'graded') => {
    if (!selectionId) {
      setQueuedQuestion({ id: questionId, role });
      setSelectionDialog({ mode: 'create', name: 'Yangi savollar to‘plami', confirmDelete: false });
      return;
    }
    if (pendingQuestionIds.has(questionId) || review?.items.some((item) => item.portable.leaf.id === questionId)) return;
    setPendingQuestionIds((current) => new Set(current).add(questionId));
    setError('');
    setBasketNotice('');
    setLastRemoved(null);
    try {
      const id = selectionId;
      const result = await api<{ dependencies: Dependency[] }>(`/selections/${id}/items`, {
        method: 'POST',
        body: JSON.stringify({ questionId, role }),
      });
      await Promise.all([loadReview(id), refreshSelections()]);
      setBasketNotice('Savol savatchaga qo‘shildi.');
      setBasketOpen(true);
      if (result.dependencies.length) setDependencyDialog(result.dependencies);
    } catch (cause) {
      setError(message(cause, 'Savol savatchaga qo‘shilmadi.'));
    } finally {
      setPendingQuestionIds((current) => {
        const next = new Set(current);
        next.delete(questionId);
        return next;
      });
    }
  };

  const changeRole = async (itemId: string, role: SelectionRole) => {
    if (!selectionId || pendingItemIds.has(itemId)) return;
    setPendingItemIds((current) => new Set(current).add(itemId));
    try {
      await api(`/selections/${selectionId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await Promise.all([loadReview(), refreshSelections()]);
    } catch (cause) {
      setError(message(cause, 'Savol roli o‘zgarmadi.'));
    } finally {
      setPendingItemIds((current) => { const next = new Set(current); next.delete(itemId); return next; });
    }
  };

  const removeItem = async (itemId: string) => {
    if (!selectionId || pendingItemIds.has(itemId)) return;
    const removed = review?.items.find((item) => item.id === itemId) ?? null;
    setPendingItemIds((current) => new Set(current).add(itemId));
    try {
      await api(`/selections/${selectionId}/items/${itemId}`, { method: 'DELETE' });
      await Promise.all([loadReview(), refreshSelections()]);
      setLastRemoved(removed);
      setBasketNotice('Savol savatchadan olib tashlandi.');
    } catch (cause) {
      setError(message(cause, 'Savol savatchadan olinmadi.'));
    } finally {
      setPendingItemIds((current) => { const next = new Set(current); next.delete(itemId); return next; });
    }
  };

  const undoRemove = async () => {
    if (!lastRemoved) return;
    const item = lastRemoved;
    setLastRemoved(null);
    setBasketNotice('');
    await addQuestion(item.portable.leaf.id, item.role);
  };

  const moveItem = async (itemId: string, direction: -1 | 1) => {
    if (!selectionId || !review || pendingItemIds.has(itemId)) return;
    const index = review.items.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= review.items.length) return;
    const nextItems = [...review.items];
    [nextItems[index], nextItems[target]] = [nextItems[target]!, nextItems[index]!];
    setReview({ ...review, items: nextItems });
    setPendingItemIds((current) => new Set(current).add(itemId));
    try {
      await api(`/selections/${selectionId}/items/order`, { method: 'PUT', body: JSON.stringify({ itemIds: nextItems.map((item) => item.id) }) });
      await Promise.all([loadReview(selectionId), refreshSelections()]);
    } catch (cause) {
      setReview(review);
      setError(message(cause, 'Savollar tartibi saqlanmadi.'));
    } finally {
      setPendingItemIds((current) => { const next = new Set(current); next.delete(itemId); return next; });
    }
  };

  const openPreview = async (questionId: string) => {
    try {
      setPreview(await api<PortableQuestion>(`/questions/${questionId}/portable`));
    } catch (cause) {
      setError(message(cause, 'Kontekst yuklanmadi.'));
    }
  };

  const displayedQuestions = useMemo(() => {
    const compare = (a: Part, b: Part) => {
      if (sort === 'newest') return b.year - a.year || b.component - a.component;
      if (sort === 'marks_asc') return a.marks - b.marks || b.year - a.year;
      if (sort === 'marks_desc') return b.marks - a.marks || b.year - a.year;
      return 0;
    };
    if (view === 'parts') return [...(questions.data as Part[])].sort(compare);
    if (sort === 'relevance') return questions.data as Family[];
    return [...(questions.data as Family[])].sort((a, b) => compare(a.parts[0]!, b.parts[0]!));
  }, [questions.data, sort, view]);

  const flat = view === 'parts'
    ? (displayedQuestions as Part[])
    : (displayedQuestions as Family[]).flatMap((family) => family.parts.filter((part) => part.matches));
  const selectedQuestionIds = useMemo(
    () => new Set(review?.items.map((item) => item.portable.leaf.id) ?? []),
    [review],
  );

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
      if ((event.key === 'Enter' || event.key === ' ') && flat[focused] && !selectedQuestionIds.has(flat[focused].id)) {
        event.preventDefault();
        void addQuestion(flat[focused].id);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [flat, focused, reviewing, preview, dependencyDialog, selectionId, selectedQuestionIds, pendingQuestionIds]);

  const scopedTopics = options.topics.filter((item) => item.syllabus_code === syllabusCode);
  const topicChoices = [...new Map(scopedTopics.map((item) => [item.topic_id, item])).values()];
  const visibleSubtopics = scopedTopics.filter((item) => !topicIds.length || topicIds.includes(item.topic_id));
  const componentChoices = options.components.filter((item) => item.syllabus_code === syllabusCode);
  const activeSyllabus = options.syllabi.find((item) => item.code === syllabusCode);
  const activeFilterCount = [component, marksMin, marksMax, yearFrom, yearTo, hasDiagram, dependency !== 'any' ? dependency : '', user.role === 'owner' && status !== 'approved' ? status : '', ...series, ...aos, ...topicIds, ...subtopicIds, ...commandWords].filter(Boolean).length;

  const changeSyllabus = (next: string) => {
    setSyllabusCode(next);
    setComponent('');
    setTopicIds([]);
    setSubtopicIds([]);
    setYearFrom('');
    setYearTo('');
  };

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
    setStatus('approved');
  };

  if (user.role === 'student') {
    return <main className="qb-auth-state"><h1>Savol banki</h1><p>Bu ish maydoni o‘qituvchi va owner uchun.</p></main>;
  }

  if (reviewing && review) {
    return <ReviewScreen review={review} selectionName={selections.find((item) => item.id === selectionId)?.name ?? 'Savollar to‘plami'} selectionId={selectionId} forClass={forClass} onBack={() => setReviewing(false)} />;
  }

  return (
    <main className="qb-page">
      <header className="qb-topbar">
        <div className="qb-topbar-left">
          <button className="qb-icon-button" title="Dashboardga qaytish" onClick={() => { window.location.hash = ''; }}>←</button>
          <div><strong>CamPath</strong><span>Question Bank v2</span></div>
        </div>
        <div className="qb-topbar-center"><span className="qb-badge qb-badge-primary">Cambridge {syllabusCode || '—'}</span>{activeSyllabus && <span className="qb-badge">{activeSyllabus.question_count} savol</span>}<span className="qb-badge">Leaf-first</span></div>
        <div className="qb-topbar-actions"><button className="qb-filter-toggle" type="button" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}><Funnel size={17} /><span>Filtrlar</span>{activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}</button><button className="qb-basket-toggle" type="button" aria-expanded={basketOpen} onClick={() => setBasketOpen((open) => !open)}><ShoppingCart size={18} /><span>Savatcha</span><strong>{review?.items.length ?? 0}</strong></button></div>
      </header>

      <div className="qb-layout">
        {filterOpen && <button className="qb-filter-backdrop" aria-label="Filtrlarni yopish" onClick={() => setFilterOpen(false)} />}
        <aside className={`qb-filters ${filterOpen ? 'open' : ''}`} aria-label="Savol filtrlari">
          <div className="qb-panel-title"><div><strong>Filtrlar</strong><small>{activeFilterCount ? `${activeFilterCount} ta faol filtr` : 'Imtihon bankini toraytiring'}</small></div><div className="qb-filter-head-actions"><button className="qb-link-button" onClick={resetFilters} disabled={!activeFilterCount}>Tozalash</button><button className="qb-icon-button qb-filter-close" aria-label="Filtrlarni yopish" onClick={() => setFilterOpen(false)}><X size={17} /></button></div></div>
          <Filter label="Syllabus"><select value={syllabusCode} onChange={(event) => changeSyllabus(event.target.value)}>{options.syllabi.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.subject} · {item.question_count} savol</option>)}</select></Filter>
          <Filter label="Komponent"><select value={component} onChange={(event) => setComponent(event.target.value)}><option value="">Barchasi</option>{componentChoices.map((item) => <option key={`${item.syllabus_code}-${item.number}`} value={item.number}>Paper {item.number} · {item.name}</option>)}</select></Filter>
          <CheckGroup label="Mavzu" options={topicChoices.map((item) => [item.topic_id, `${item.topic_number}. ${item.topic_title}`])} value={topicIds} onChange={(next) => { setTopicIds(next); setSubtopicIds((current) => current.filter((id) => scopedTopics.some((item) => item.subtopic_id === id && (!next.length || next.includes(item.topic_id))))); }} maxHeight />
          <CheckGroup label="Kichik mavzu" options={visibleSubtopics.map((item) => [item.subtopic_id, `${item.code} ${item.subtopic_title}`])} value={subtopicIds} onChange={setSubtopicIds} maxHeight />
          <Filter label="Ball"><div className="qb-two-fields"><input type="number" min="0" placeholder="dan" value={marksMin} onChange={(event) => setMarksMin(event.target.value)} /><input type="number" min="0" placeholder="gacha" value={marksMax} onChange={(event) => setMarksMax(event.target.value)} /></div></Filter>
          <Filter label="Yil"><div className="qb-two-fields"><input type="number" min="2000" placeholder="dan" value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} /><input type="number" min="2000" placeholder="gacha" value={yearTo} onChange={(event) => setYearTo(event.target.value)} /></div></Filter>
          <CheckGroup label="Sessiya" options={Object.entries(seriesLabels)} value={series} onChange={setSeries} />
          <CheckGroup label="Assessment Objective" options={['AO1', 'AO2', 'AO3'].map((item) => [item, item])} value={aos} onChange={setAos} />
          <Filter label="Diagramma / rasm"><select value={hasDiagram} onChange={(event) => setHasDiagram(event.target.value)}><option value="">Barchasi</option><option value="true">Bor</option><option value="false">Yo‘q</option></select></Filter>
          <Filter label="Bog‘liqlik"><select value={dependency} onChange={(event) => setDependency(event.target.value as 'any' | 'independent')}><option value="any">Barchasi</option><option value="independent">Mustaqil savollar</option></select></Filter>
          {user.role === 'owner' && <Filter label="Review holati"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Barchasi (approved + review)</option><option value="approved">Tasdiqlangan</option><option value="needs_review">Topic tekshiruvda</option><option value="draft">Qoralama</option><option value="rejected">Rad etilgan</option><option value="archived">Arxivlangan</option></select></Filter>}
          <button className="qb-filter-apply" onClick={() => setFilterOpen(false)}>Natijalarni ko‘rish · {displayedQuestions.length}</button>
        </aside>

        <section className="qb-results">
          <div className="qb-search-row"><label className="qb-search"><MagnifyingGlass size={19} aria-hidden="true" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Savol matnidan qidirish" placeholder="Savol matni yoki reference bo‘yicha qidiring…" />{query && <button type="button" aria-label="Qidiruvni tozalash" onClick={() => setQuery('')}><X size={16} /></button>}</label><div className="qb-segments" aria-label="Savol ko‘rinishi"><button className={view === 'parts' ? 'active' : ''} onClick={() => setView('parts')}>Qismlar</button><button className={view === 'families' ? 'active' : ''} onClick={() => setView('families')}>Oilalar</button></div></div>
          <div className="qb-result-toolbar"><div className="qb-result-meta"><div><strong>{displayedQuestions.length}</strong><span>{view === 'parts' ? ' mos qism' : ' savol oilasi'}</span>{activeFilterCount > 0 && <span className="qb-active-filter-note">· {activeFilterCount} filtr faol</span>}</div><small>{syllabusCode ? `${syllabusCode} · ` : ''}↑↓ tanlash · Enter qo‘shish</small></div><label className="qb-sort"><span>Saralash</span><select value={sort} onChange={(event) => setSort(event.target.value as BankSort)}><option value="relevance">Moslik bo‘yicha</option><option value="newest">Eng yangi</option><option value="marks_asc">Ball: kamdan ko‘pga</option><option value="marks_desc">Ball: ko‘pdan kamga</option></select></label></div>
          {questions.unavailableFilters.length > 0 && <div className="qb-notice">Hozircha ishlamaydigan filtrlar: {questions.unavailableFilters.join(', ')}</div>}
          {error && <div className="qb-error">{error}</div>}
          {loading && <div className="qb-loading">Savollar yuklanmoqda…</div>}
          {!loading && view === 'parts' && <div className="qb-card-list">{(displayedQuestions as Part[]).map((part, index) => <PartCard key={part.id} part={part} focused={focused === index} selected={selectedQuestionIds.has(part.id)} pending={pendingQuestionIds.has(part.id)} onAdd={() => void addQuestion(part.id)} onPreview={() => void openPreview(part.id)} />)}</div>}
          {!loading && view === 'families' && <div className="qb-card-list">{(displayedQuestions as Family[]).map((family) => <FamilyCard key={family.rootId} family={family} selectedIds={selectedQuestionIds} pendingIds={pendingQuestionIds} onAdd={(id) => void addQuestion(id)} onPreview={(id) => void openPreview(id)} />)}</div>}
          {!loading && questions.data.length === 0 && <div className="qb-empty"><strong>Savol topilmadi</strong><span>Qidiruv yoki filtrlarni o‘zgartirib ko‘ring.</span><button className="qb-secondary-button" onClick={resetFilters}>Barcha filtrlarni tozalash</button></div>}
        </section>

        {basketOpen && <button className="qb-basket-backdrop" aria-label="Savatchani yopish" onClick={() => setBasketOpen(false)} />}
        <aside className={`qb-basket ${basketOpen ? 'open' : ''}`} aria-label="Savollar savatchasi">
          <div className="qb-panel-title"><div><strong>Savatcha</strong><small>Serverda avtomatik saqlanadi</small></div><div className="qb-basket-head-actions"><button className="qb-icon-button" aria-label="Savatcha nomini o‘zgartirish" disabled={!selectionId} onClick={() => setSelectionDialog({ mode: 'rename', name: selections.find((item) => item.id === selectionId)?.name ?? '', confirmDelete: false })}><PencilSimple size={16} /></button><button className="qb-icon-button" aria-label="Yangi savatcha" onClick={() => void createSelection()}><Plus size={17} /></button><button className="qb-icon-button qb-basket-close" aria-label="Savatchani yopish" onClick={() => setBasketOpen(false)}><X size={17} /></button></div></div>
          <select className="qb-basket-select" value={selectionId} onChange={(event) => { setReview(null); setBasketNotice(''); setLastRemoved(null); setSelectionId(event.target.value); }}><option value="">Savatchani tanlang</option>{selections.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.item_count} ta · {item.total_marks} ball</option>)}</select>
          <div className="qb-basket-items">
            {reviewLoading && <div className="qb-loading">Savatcha yuklanmoqda…</div>}
            {!reviewLoading && review?.items.map((item, index) => <article className={`qb-basket-item ${pendingItemIds.has(item.id) ? 'pending' : ''}`} key={item.id}><div className="qb-basket-item-head"><div className="qb-basket-order"><button disabled={index === 0 || pendingItemIds.has(item.id)} aria-label={`${item.freshRef} savolini yuqoriga surish`} onClick={() => void moveItem(item.id, -1)}><CaretUp size={14} /></button><button disabled={index === review.items.length - 1 || pendingItemIds.has(item.id)} aria-label={`${item.freshRef} savolini pastga surish`} onClick={() => void moveItem(item.id, 1)}><CaretDown size={14} /></button><strong>{item.freshRef}</strong></div><button disabled={pendingItemIds.has(item.id)} aria-label={`${item.freshRef} savolini olib tashlash`} onClick={() => void removeItem(item.id)}><Trash size={15} /></button></div><small>{item.sourceRef}</small><p>{item.portable.leaf.stem}</p><div className="qb-basket-item-footer"><select aria-label={`${item.freshRef} savolining roli`} disabled={pendingItemIds.has(item.id)} value={item.role} onChange={(event) => void changeRole(item.id, event.target.value as SelectionRole)}><option value="graded">Baholanadi · {item.portable.leaf.marks} ball</option><option value="context_only">Faqat kontekst · 0 ball</option></select><button className="qb-link-button" onClick={() => setPreview(item.portable)}>Ko‘rish</button></div></article>)}
            {!reviewLoading && selectionId && !review?.items.length && <div className="qb-empty small"><span>Savollarni + bilan qo‘shing.</span></div>}
            {!selectionId && <div className="qb-empty small"><span>Avval savatcha yarating.</span></div>}
          </div>
          {basketNotice && <div className="qb-basket-notice"><span>{basketNotice}</span>{lastRemoved && <button onClick={() => void undoRemove()}>Qaytarish</button>}</div>}
          {review?.dependencyIssues.length ? <div className="qb-issues">{review.dependencyIssues.map((issue, index) => <div className={`qb-issue ${issue.severity}`} key={`${issue.code}-${index}`}><strong>{issue.severity === 'error' ? '!' : 'i'} {issue.dependsOnRef}</strong><span>{issueLabel(issue)}</span></div>)}</div> : null}
          <div className="qb-basket-summary"><div><span>Tanlangan</span><strong>{review?.items.length ?? 0} ta</strong></div><div><span>Jami</span><strong>{review?.totalMarks ?? 0} ball</strong></div><div><span>Dependency</span><strong className={review?.canPublish === false ? 'qb-danger-text' : 'qb-success-text'}>{review?.canPublish === false ? 'Bloklangan' : 'Tayyor'}</strong></div><button disabled={!review?.items.length} onClick={() => setReviewing(true)}>Ko‘rib chiqish</button></div>
        </aside>
      </div>
      {preview && <PortableModal portable={preview} onClose={() => setPreview(null)} />}
      {dependencyDialog && <DependencyModal dependencies={dependencyDialog} onClose={() => setDependencyDialog(null)} onAdd={(id, role) => void addQuestion(id, role)} />}
      {selectionDialog && <SelectionDialog state={selectionDialog} saving={selectionSaving} canDelete={selectionDialog.mode === 'rename' && Boolean(selectionId)} onChange={setSelectionDialog} onSave={() => void saveSelectionDialog()} onDelete={() => void deleteSelection()} onClose={() => { setSelectionDialog(null); setQueuedQuestion(null); }} />}
    </main>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) { return <label className="qb-filter"><span>{label}</span>{children}</label>; }

function CheckGroup({ label, options, value, onChange, maxHeight = false }: { label: string; options: Array<[string, string]>; value: string[]; onChange: (value: string[]) => void; maxHeight?: boolean; }) {
  return <fieldset className={`qb-check-group ${maxHeight ? 'scroll' : ''}`}><legend>{label}</legend><div>{options.map(([id, text]) => <label key={id}><input type="checkbox" checked={value.includes(id)} onChange={(event) => onChange(event.target.checked ? [...value, id] : value.filter((item) => item !== id))} /><span>{text}</span></label>)}</div></fieldset>;
}

function SelectionDialog({ state, saving, canDelete, onChange, onSave, onDelete, onClose }: { state: { mode: 'create' | 'rename'; name: string; confirmDelete: boolean }; saving: boolean; canDelete: boolean; onChange: (state: { mode: 'create' | 'rename'; name: string; confirmDelete: boolean }) => void; onSave: () => void; onDelete: () => void; onClose: () => void }) {
  useDialogClose(onClose);
  return <div className="qb-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}><section className="qb-modal qb-selection-modal" role="dialog" aria-modal="true" aria-labelledby="selection-dialog-title"><header><div><span className="qb-eyebrow">Savatcha boshqaruvi</span><h2 id="selection-dialog-title">{state.mode === 'create' ? 'Yangi savatcha' : 'Savatchani tahrirlash'}</h2></div><button className="qb-icon-button" aria-label="Oynani yopish" disabled={saving} onClick={onClose}><X size={18} /></button></header>{!state.confirmDelete ? <form onSubmit={(event) => { event.preventDefault(); onSave(); }}><label className="qb-dialog-field"><span>Savatcha nomi</span><input autoFocus maxLength={120} value={state.name} onChange={(event) => onChange({ ...state, name: event.target.value })} placeholder="Masalan, 10-sinf · Networks nazorat" /></label><div className="qb-selection-dialog-actions">{canDelete && <button className="qb-danger-button" type="button" onClick={() => onChange({ ...state, confirmDelete: true })}><Trash size={16} /> O‘chirish</button>}<div><button className="qb-secondary-button" type="button" onClick={onClose}>Bekor qilish</button><button type="submit" disabled={!state.name.trim() || saving}>{saving ? 'Saqlanmoqda…' : state.mode === 'create' ? 'Yaratish' : 'Saqlash'}</button></div></div></form> : <div className="qb-delete-confirm"><div className="qb-delete-icon"><Trash size={22} /></div><h3>Savatchani o‘chirasizmi?</h3><p>Undagi barcha tanlangan savollar ham o‘chadi. Bu amalni qaytarib bo‘lmaydi.</p><div><button className="qb-secondary-button" onClick={() => onChange({ ...state, confirmDelete: false })}>Ortga</button><button className="qb-danger-button solid" disabled={saving} onClick={onDelete}>{saving ? 'O‘chirilmoqda…' : 'Ha, o‘chirish'}</button></div></div>}</section></div>;
}

function useDialogClose(onClose: () => void) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);
}

function PartCard({ part, focused, selected, pending, onAdd, onPreview }: { part: Part; focused: boolean; selected: boolean; pending: boolean; onAdd: () => void; onPreview: () => void }) {
  return <article className={`qb-question-card ${focused ? 'focused' : ''} ${selected ? 'selected' : ''}`}><div className="qb-question-main"><div className="qb-meta-line"><strong>{part.displayRef}</strong><span>{part.syllabusCode}</span><span>{part.year} {seriesLabel(part.series)}</span><span>Paper {part.component}{part.variant ? ` · V${part.variant}` : ''}</span>{part.ao && <span>{part.ao}</span>}{part.commandWord && <span>{part.commandWord}</span>}{part.status === 'needs_review' && <span className="qb-chip warning">Topic review</span>}{part.hasDiagram && <span className="qb-chip">Diagramma</span>}{part.hasDependency && <span className="qb-chip warning">Bog‘liq</span>}</div><p>{part.stem}</p>{part.subtopics?.length > 0 && <div className="qb-topic-tags">{part.subtopics.map((topic) => <span key={topic.id}>{topic.code} {topic.title}</span>)}</div>}</div><div className="qb-question-actions"><strong>{part.marks} ball</strong><button className="qb-secondary-button" onClick={onPreview}>Kontekst</button><button className={`qb-add-button ${selected ? 'selected' : ''}`} disabled={selected || pending} aria-label={selected ? `${part.displayRef} savatchaga qo‘shilgan` : `${part.displayRef} savatchaga qo‘shish`} onClick={onAdd}>{pending ? '…' : selected ? <Check size={18} weight="bold" /> : <Plus size={18} weight="bold" />}</button></div></article>;
}

function FamilyCard({ family, selectedIds, pendingIds, onAdd, onPreview }: { family: Family; selectedIds: Set<string>; pendingIds: Set<string>; onAdd: (id: string) => void; onPreview: (id: string) => void }) {
  return <details className="qb-family" open><summary><div><strong>{family.rootRef}</strong><span>{family.totalCount} qismdan {family.matchCount} tasi filtrga mos</span></div><CaretDown size={16} /></summary><div className="qb-family-parts">{family.parts.map((part) => { const selected = selectedIds.has(part.id); const pending = pendingIds.has(part.id); return <article className={`${part.matches ? 'match' : ''} ${selected ? 'selected' : ''}`} key={part.id}><div><strong>{part.displayRef}</strong>{part.status === 'needs_review' && <span className="qb-chip warning">Topic review</span>}<p>{part.stem}</p></div><span>{part.marks} ball</span><button className="qb-link-button" onClick={() => onPreview(part.id)}>Kontekst</button><button className={`qb-add-button ${selected ? 'selected' : ''}`} disabled={selected || pending} aria-label={selected ? `${part.displayRef} savatchaga qo‘shilgan` : `${part.displayRef} savatchaga qo‘shish`} onClick={() => onAdd(part.id)}>{pending ? '…' : selected ? <Check size={16} weight="bold" /> : <Plus size={16} weight="bold" />}</button></article>; })}</div></details>;
}

function ContextBlocks({ portable }: { portable: PortableQuestion }) {
  if (!portable.contextBlocks.length) return <div className="qb-no-context">Alohida shared context talab qilinmaydi.</div>;
  return <div className="qb-context-list">{portable.contextBlocks.map((block) => <section key={block.id}><div className="qb-context-head"><strong>{block.displayRef}</strong><span>Context</span></div>{block.context && <p>{block.context}</p>}{block.assets.map((asset) => <div className="qb-asset" key={asset.id}><strong>{asset.kind}</strong><span>{asset.altText || 'Savol asseti'}{asset.sourcePage ? ` · source page ${asset.sourcePage}` : ''}</span>{asset.contentMd && <pre>{asset.contentMd}</pre>}{!asset.contentMd && asset.storagePath && <small>Private storage asset: {asset.storagePath.split('/').pop()}</small>}</div>)}</section>)}</div>;
}

function PortableModal({ portable, onClose }: { portable: PortableQuestion; onClose: () => void }) {
  useDialogClose(onClose);
  return <div className="qb-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="qb-modal qb-portable-modal" role="dialog" aria-modal="true" aria-labelledby="portable-title"><header><div><span className="qb-eyebrow">Portable question</span><h2 id="portable-title">{portable.sourceRef}</h2></div><button className="qb-icon-button" aria-label="Oynani yopish" onClick={onClose}><X size={18} /></button></header><div className="qb-chain">{portable.chain.map((node, index) => <span key={node.id}>{index ? '→' : ''} {node.label}</span>)}</div><ContextBlocks portable={portable} /><article className="qb-leaf-preview"><div><strong>{portable.leaf.displayRef}</strong><span>{portable.leaf.commandWord ?? '—'} · {portable.leaf.marks} ball</span></div><p>{portable.leaf.stem}</p></article>{portable.dependencies.length > 0 && <div className="qb-dependency-preview"><strong>Bog‘liqliklar</strong>{portable.dependencies.map((item) => <div key={item.id}><span className={`qb-chip ${item.kind === 'answer_ref' ? 'danger' : 'warning'}`}>{item.kind}</span><b>{item.displayRef}</b><span>{item.evidence ?? item.stem}</span></div>)}</div>}<footer><small>Original manba: {portable.sourceRef}</small><button onClick={onClose}>Yopish</button></footer></section></div>;
}

function DependencyModal({ dependencies, onClose, onAdd }: { dependencies: Dependency[]; onClose: () => void; onAdd: (id: string, role: SelectionRole) => void }) {
  useDialogClose(onClose);
  return <div className="qb-modal-backdrop" role="presentation"><section className="qb-modal qb-dependency-modal" role="dialog" aria-modal="true" aria-labelledby="dependency-title"><header><div><span className="qb-eyebrow">Dependency check</span><h2 id="dependency-title">Oldingi qism kerak</h2></div><button className="qb-icon-button" aria-label="Oynani yopish" onClick={onClose}><X size={18} /></button></header><p className="qb-modal-intro">Tanlangan subpart boshqa qismdagi material yoki candidate javobiga tayanadi. To‘g‘ri prerequisite’ni qo‘shing.</p><div className="qb-dependency-list">{dependencies.map((item) => <article key={item.id}><div className="qb-meta-line"><strong>{item.displayRef}</strong><span className={`qb-chip ${item.kind === 'answer_ref' ? 'danger' : 'warning'}`}>{item.kind}</span><span>{item.strength}</span></div><p>{item.stem || item.evidence || 'Referenced part'}</p>{item.evidence && <blockquote>{item.evidence}</blockquote>}<div className="qb-modal-actions"><button onClick={() => onAdd(item.dependsOnId, 'graded')}>Baholanadigan qilib qo‘shish</button><button className="qb-secondary-button" disabled={item.kind === 'answer_ref'} title={item.kind === 'answer_ref' ? 'Candidate javobi kerak: prerequisite baholanadigan bo‘lishi shart.' : ''} onClick={() => onAdd(item.dependsOnId, 'context_only')}>Faqat kontekst</button></div></article>)}</div><footer><small>`answer_ref` faqat graded prerequisite bilan qondiriladi.</small><button className="qb-secondary-button" onClick={onClose}>Keyin hal qilaman</button></footer></section></div>;
}

function ReviewScreen({ review, selectionName, selectionId, forClass, onBack }: { review: SelectionReview; selectionName: string; selectionId: string; forClass: string; onBack: () => void }) {
  const [exporting, setExporting] = useState<'pdf' | 'docx' | ''>('');
  const [exportError, setExportError] = useState('');
  const syllabusCodes = [...new Set(review.items.map((item) => item.sourceRef.split('/')[0]).filter(Boolean))];
  const documentLabel = syllabusCodes.length === 1 ? `Cambridge ${syllabusCodes[0]}` : 'Cambridge mixed syllabus';
  const fileStem = syllabusCodes.length === 1 ? `cambridge-${syllabusCodes[0]}-practice` : 'cambridge-mixed-practice';

  const exportSelection = async (format: 'pdf' | 'docx') => {
    if (!selectionId || !review.canPublish || exporting) return;
    setExporting(format);
    setExportError('');
    try {
      const exp = await api<ExportItem>('/exports', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ kind: 'question_paper', refTable: 'selections', refId: selectionId, format, title: `${documentLabel} practice` }) });
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
      anchor.download = `${fileStem}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setExportError(message(cause, 'Hujjat yuklanmadi.'));
    } finally {
      setExporting('');
    }
  };

  return <main className="qb-review-page"><header className="qb-review-header"><button className="qb-secondary-button" onClick={onBack}>← Savol bankiga qaytish</button><div><strong>{selectionName}</strong><span>{review.items.length} qism · {review.totalMarks} ball</span></div><span className={`qb-review-state ${review.canPublish ? 'ready' : 'blocked'}`}>{review.canPublish ? 'Eksportga tayyor' : 'Dependency bloklangan'}</span></header><div className="qb-review-layout"><section className="qb-review-paper"><div className="qb-paper-title"><span>{documentLabel.toUpperCase()} · GENERATED PRACTICE</span><h1>{selectionName}</h1><small>Yangi raqamlash · asl manba reference’lari saqlangan</small></div>{review.items.map((item) => <article className={`qb-review-question ${item.role === 'context_only' ? 'context-only' : ''}`} key={item.id}><div className="qb-review-question-head"><strong>{item.freshRef}</strong><span>{item.role === 'graded' ? `${item.effectiveMarks} ball` : 'Faqat kontekst · 0 ball'}</span></div><ContextBlocks portable={item.portable} /><p className="qb-review-stem">{item.portable.leaf.stem}</p><footer>Manba: {item.sourceRef}</footer></article>)}</section><aside className="qb-review-side"><h2>Tayyorlik tekshiruvi</h2><div className="qb-review-stat"><span>Savollar</span><strong>{review.items.length}</strong></div><div className="qb-review-stat"><span>Jami ball</span><strong>{review.totalMarks}</strong></div><div className="qb-review-stat"><span>Bog‘liqlik muammolari</span><strong>{review.dependencyIssues.length}</strong></div>{review.dependencyIssues.map((issue, index) => <div className={`qb-issue ${issue.severity}`} key={`${issue.code}-${index}`}><strong>{issue.dependsOnRef}</strong><span>{issueLabel(issue)}</span>{issue.evidence && <small>{issue.evidence}</small>}</div>)}{!review.dependencyIssues.length && <div className="qb-success-box">✓ Barcha bog‘liqlik qoidalari bajarilgan.</div>}<button disabled={!review.canPublish || !selectionId || Boolean(exporting)} onClick={() => void exportSelection('pdf')}>{exporting === 'pdf' ? 'PDF tayyorlanmoqda…' : 'PDF yuklab olish'}</button><button className="qb-secondary-button" disabled={!review.canPublish || !selectionId || Boolean(exporting)} onClick={() => void exportSelection('docx')}>{exporting === 'docx' ? 'Word tayyorlanmoqda…' : 'Word (.docx) yuklab olish'}</button><button className="qb-secondary-button" disabled={!review.canPublish || !selectionId || Boolean(exporting)} onClick={() => navigate(`oqitish/tanlovlar?id=${encodeURIComponent(selectionId)}${forClass ? `&sinf=${encodeURIComponent(forClass)}` : ''}`)}>Topshiriq yaratish →</button>{exportError && <div className="qb-error">{exportError}</div>}<small className="qb-muted">PDF va Word hujjatlari shu savatchadan to‘g‘ridan-to‘g‘ri tayyorlanadi.</small></aside></div></main>;
}

function issueLabel(issue: SelectionIssue) {
  if (issue.code === 'answer_dependency_requires_graded') return `${issue.questionRef} uchun ${issue.dependsOnRef} candidate javobi kerak — prerequisite graded bo‘lishi shart.`;
  if (issue.code === 'required_text_dependency_missing') return `${issue.questionRef} uchun ${issue.dependsOnRef} dagi printed material majburiy.`;
  return `${issue.dependsOnRef} konteksti foydali; qo‘shish tavsiya etiladi.`;
}
