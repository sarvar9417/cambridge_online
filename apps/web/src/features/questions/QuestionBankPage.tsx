import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COMMAND_WORDS } from '@campath/shared';
import { api } from '../../lib/api';
import { ContextChain } from './ContextChain';
import type { Dependency, Family, Part, Review, Role, SelectionSummary } from './types';

type View = 'parts' | 'families';
const seriesOptions: ReadonlyArray<readonly [string, string]> = [
  ['FM', 'Fevral / Mart'],
  ['MJ', 'May / Iyun'],
  ['ON', 'Oktabr / Noyabr'],
];
const aoOptions = ['AO1', 'AO2', 'AO3'];

interface FilterOptions {
  topics: Array<{
    topic_id: string;
    topic_number: string;
    topic_title: string;
    subtopic_id: string;
    code: string;
    subtopic_title: string;
  }>;
  classes: Array<{ id: string; name: string }>;
}

export function QuestionBankPage({
  fullName,
  role,
}: {
  fullName: string;
  role: 'owner' | 'teacher';
}) {
  const client = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('parts');
  const [query, setQuery] = useState('');
  const [component, setComponent] = useState('');
  const [marks, setMarks] = useState({ min: '', max: '' });
  const [year, setYear] = useState({ from: '', to: '' });
  const [series, setSeries] = useState<string[]>([]);
  const [aos, setAos] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [subtopicIds, setSubtopicIds] = useState<string[]>([]);
  const [commandWords, setCommandWords] = useState<string[]>([]);
  const [diagram, setDiagram] = useState('');
  const [status, setStatus] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [unusedInClassId, setUnusedInClassId] = useState('');
  const [dependency, setDependency] = useState('any');
  const [selectionId, setSelectionId] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [focused, setFocused] = useState(0);
  const [dependencyDialog, setDependencyDialog] = useState<Dependency[] | null>(null);

  const params = useMemo(() => {
    const value = new URLSearchParams({ view, dependency });
    if (query) value.set('q', query);
    if (component) value.set('component', component);
    if (marks.min) value.set('marksMin', marks.min);
    if (marks.max) value.set('marksMax', marks.max);
    if (year.from) value.set('yearFrom', year.from);
    if (year.to) value.set('yearTo', year.to);
    if (diagram) value.set('hasDiagram', diagram);
    series.forEach((item) => value.append('series', item));
    aos.forEach((item) => value.append('aos', item));
    topicIds.forEach((item) => value.append('topicIds', item));
    subtopicIds.forEach((item) => value.append('subtopicIds', item));
    commandWords.forEach((item) => value.append('commandWords', item));
    if (status) value.set('status', status);
    if (difficulty) value.set('difficulty', difficulty);
    if (unusedInClassId) value.set('unusedInClassId', unusedInClassId);
    return value.toString();
  }, [
    view,
    dependency,
    query,
    component,
    marks,
    year,
    diagram,
    series,
    aos,
    topicIds,
    subtopicIds,
    commandWords,
    status,
    difficulty,
    unusedInClassId,
  ]);
  const questions = useQuery({
    queryKey: ['questions', params],
    queryFn: () =>
      api<{ data: Part[] | Family[]; unavailableFilters: string[] }>(`/questions?${params}`),
  });
  const options = useQuery({
    queryKey: ['question-filter-options'],
    queryFn: () => api<FilterOptions>('/questions/filter-options'),
  });
  const selections = useQuery({
    queryKey: ['selections'],
    queryFn: () => api<SelectionSummary[]>('/selections'),
  });
  const review = useQuery({
    queryKey: ['selection', selectionId],
    queryFn: () => api<Review>(`/selections/${selectionId}`),
    enabled: Boolean(selectionId),
  });

  useEffect(() => {
    if (!selectionId && selections.data?.[0]) setSelectionId(selections.data[0].id);
  }, [selectionId, selections.data]);
  const create = useMutation({
    mutationFn: (name: string) =>
      api<SelectionSummary>('/selections', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: async (item) => {
      setSelectionId(item.id);
      await client.invalidateQueries({ queryKey: ['selections'] });
    },
  });
  const add = useMutation({
    mutationFn: ({ id, role = 'graded' }: { id: string; role?: Role }) =>
      api<{ dependencies: Dependency[] }>(`/selections/${selectionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ questionId: id, role }),
      }),
    onSuccess: async (result) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['selection', selectionId] }),
        client.invalidateQueries({ queryKey: ['selections'] }),
      ]);
      if (result.dependencies.length) setDependencyDialog(result.dependencies);
    },
  });
  const changeRole = useMutation({
    mutationFn: ({ itemId, role }: { itemId: string; role: Role }) =>
      api(`/selections/${selectionId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['selection', selectionId] }),
  });
  const remove = useMutation({
    mutationFn: (itemId: string) =>
      api(`/selections/${selectionId}/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['selection', selectionId] }),
        client.invalidateQueries({ queryKey: ['selections'] }),
      ]);
    },
  });
  const flat =
    view === 'parts'
      ? ((questions.data?.data as Part[]) ?? [])
      : ((questions.data?.data as Family[]) ?? []).flatMap((family) =>
          family.parts.filter((part) => part.matches),
        );
  const ensureSelection = () => {
    if (selectionId) return true;
    const name = window.prompt('Yangi savatcha nomi');
    if (name?.trim()) create.mutate(name);
    return false;
  };
  const addQuestion = (id: string) => {
    if (ensureSelection()) add.mutate({ id });
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const editing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(
        (event.target as HTMLElement).tagName,
      );
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (editing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setFocused((i) =>
          Math.max(0, Math.min(flat.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1))),
        );
      }
      if ((event.key === ' ' || event.key === 'Enter') && flat[focused]) {
        event.preventDefault();
        addQuestion(flat[focused].id);
      }
      if (event.key.toLowerCase() === 'a' && flat[focused]) addQuestion(flat[focused].id);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (reviewing && review.data)
    return <ReviewScreen review={review.data} onBack={() => setReviewing(false)} />;
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
        <strong>CamPath</strong>
        <span className="text-sm text-slate-600">{fullName}</span>
      </header>
      <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-[230px_minmax(0,1fr)_300px]">
        <aside className="space-y-5 border-r border-slate-200 bg-white p-4">
          <h1 className="text-base font-semibold">Savollar banki</h1>
          <Filter label="Komponent">
            <input
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              type="number"
              min="1"
              className="field"
            />
          </Filter>
          <Checks
            label="Mavzu"
            options={[
              ...new Map(
                (options.data?.topics ?? []).map((t) => [
                  t.topic_id,
                  `${t.topic_number} ${t.topic_title}`,
                ]),
              ).entries(),
            ]}
            value={topicIds}
            onChange={setTopicIds}
          />
          <Checks
            label="Kichik mavzu"
            options={(options.data?.topics ?? [])
              .filter((t) => !topicIds.length || topicIds.includes(t.topic_id))
              .map((t) => [t.subtopic_id, `${t.code} ${t.subtopic_title}`])}
            value={subtopicIds}
            onChange={setSubtopicIds}
          />
          <Checks
            label="Buyruq so‘zi"
            options={COMMAND_WORDS.map((word) => [word, word])}
            value={commandWords}
            onChange={setCommandWords}
          />
          <Filter label="Ball">
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="dan"
                value={marks.min}
                onChange={(e) => setMarks({ ...marks, min: e.target.value })}
                type="number"
                className="field"
              />
              <input
                placeholder="gacha"
                value={marks.max}
                onChange={(e) => setMarks({ ...marks, max: e.target.value })}
                type="number"
                className="field"
              />
            </div>
          </Filter>
          <Filter label="Yil">
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="dan"
                value={year.from}
                onChange={(e) => setYear({ ...year, from: e.target.value })}
                type="number"
                className="field"
              />
              <input
                placeholder="gacha"
                value={year.to}
                onChange={(e) => setYear({ ...year, to: e.target.value })}
                type="number"
                className="field"
              />
            </div>
          </Filter>
          <Checks label="Sessiya" options={seriesOptions} value={series} onChange={setSeries} />
          <Checks label="AO" options={aoOptions} value={aos} onChange={setAos} />
          <Filter label="Diagramma">
            <select className="field" value={diagram} onChange={(e) => setDiagram(e.target.value)}>
              <option value="">Barchasi</option>
              <option value="true">Bor</option>
              <option value="false">Yo‘q</option>
            </select>
          </Filter>
          {role === 'owner' && (
            <Filter label="Holat">
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Barchasi</option>
                <option value="approved">Tasdiqlangan</option>
                <option value="draft">Qoralama</option>
                <option value="needs_review">Tekshiruvda</option>
                <option value="rejected">Rad etilgan</option>
                <option value="archived">Arxivlangan</option>
              </select>
            </Filter>
          )}
          <Filter label="Qiyinlik">
            <select
              className="field"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="">Barchasi</option>
              <option value="easy">Oson</option>
              <option value="medium">O‘rta</option>
              <option value="hard">Qiyin</option>
            </select>
            {difficulty && (
              <small className="text-amber-700">Baholash ma’lumoti hali import qilinmagan.</small>
            )}
          </Filter>
          <Filter label="Sinfda ishlatilmagan">
            <select
              className="field"
              value={unusedInClassId}
              onChange={(e) => setUnusedInClassId(e.target.value)}
            >
              <option value="">Barcha savollar</option>
              {options.data?.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {unusedInClassId && (
              <small className="text-amber-700">Topshiriqlar moduli kelgach faollashadi.</small>
            )}
          </Filter>
          <Filter label="Bog‘liqlik">
            <select
              className="field"
              value={dependency}
              onChange={(e) => setDependency(e.target.value)}
            >
              <option value="any">Barchasi</option>
              <option value="independent">Mustaqil</option>
            </select>
          </Filter>
        </aside>
        <section className="min-w-0 p-5">
          <div className="mb-4 flex gap-3">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Savol matnidan qidirish  /"
              className="field flex-1"
            />
            <div className="flex rounded-md border border-slate-300 bg-white p-0.5">
              <button
                onClick={() => setView('parts')}
                className={`segment ${view === 'parts' ? 'segment-active' : ''}`}
              >
                Qismlar
              </button>
              <button
                onClick={() => setView('families')}
                className={`segment ${view === 'families' ? 'segment-active' : ''}`}
              >
                Oilalar
              </button>
            </div>
          </div>
          {questions.isLoading && <p className="text-sm text-slate-500">Yuklanmoqda...</p>}
          {questions.isError && <p className="text-sm text-red-700">Savollarni yuklab bo‘lmadi.</p>}
          <div className="space-y-2">
            {view === 'parts'
              ? ((questions.data?.data as Part[]) ?? []).map((part, i) => (
                  <PartRow
                    key={part.id}
                    part={part}
                    focused={focused === i}
                    onAdd={() => addQuestion(part.id)}
                  />
                ))
              : ((questions.data?.data as Family[]) ?? []).map((family) => (
                  <FamilyRow key={family.rootId} family={family} onAdd={addQuestion} />
                ))}
          </div>
        </section>
        <aside className="border-l border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Savatcha</h2>
            <button
              title="Yangi savatcha"
              className="icon-button"
              onClick={() => {
                const name = window.prompt('Yangi savatcha nomi');
                if (name?.trim()) create.mutate(name);
              }}
            >
              +
            </button>
          </div>
          <select
            value={selectionId}
            onChange={(e) => setSelectionId(e.target.value)}
            className="field mb-4"
          >
            <option value="">Savatchani tanlang</option>
            {selections.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.item_count})
              </option>
            ))}
          </select>
          <div className="space-y-2">
            {review.data?.items.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex justify-between gap-2">
                  <strong className="text-sm">{item.freshRef}</strong>
                  <button
                    title="Olib tashlash"
                    onClick={() => remove.mutate(item.id)}
                    className="text-slate-400 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                  {item.portable.leaf.stem}
                </p>
                <select
                  value={item.role}
                  onChange={(e) =>
                    changeRole.mutate({ itemId: item.id, role: e.target.value as Role })
                  }
                  className="mt-2 w-full text-xs"
                >
                  <option value="graded">Baholanadi</option>
                  <option value="context_only">Faqat kontekst (0 ball)</option>
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-sm">
              <span>Jami</span>
              <strong>{review.data?.totalMarks ?? 0} ball</strong>
            </div>
            <button
              disabled={!review.data?.items.length}
              onClick={() => setReviewing(true)}
              className="mt-3 w-full rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Ko‘rib chiqish
            </button>
          </div>
        </aside>
      </div>
      {dependencyDialog && (
        <DependencyModal
          dependencies={dependencyDialog}
          onClose={() => setDependencyDialog(null)}
          onAdd={(id, role) => add.mutate({ id, role })}
        />
      )}
    </main>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
function Checks({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<string | readonly [string, string]>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-medium text-slate-600">{label}</legend>
      {options.map((option) => {
        const [id, text] =
          typeof option === 'string' ? [option, option.replace('_', ' / ')] : option;
        return (
          <label key={id} className="flex items-start gap-2 py-1 text-xs">
            <input
              type="checkbox"
              checked={value.includes(id)}
              onChange={(e) =>
                onChange(e.target.checked ? [...value, id] : value.filter((v) => v !== id))
              }
            />
            <span>{text}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
function PartRow({ part, focused, onAdd }: { part: Part; focused: boolean; onAdd: () => void }) {
  return (
    <article
      className={`rounded-md border bg-white p-4 ${focused ? 'border-teal-600 ring-1 ring-teal-600' : 'border-slate-200'}`}
    >
      <div className="flex justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <strong className="text-slate-800">{part.displayRef}</strong>
            <span>{part.year}</span>
            <span>{part.series}</span>
            <span>C{part.component}</span>
            {part.ao && <span>{part.ao}</span>}
            {part.hasDependency && <span>Bog‘liq</span>}
          </div>
          <p className="whitespace-pre-wrap text-sm">{part.stem}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between">
          <strong className="text-sm">{part.marks} ball</strong>
          <button onClick={onAdd} title="Savatchaga qo‘shish" className="icon-button">
            +
          </button>
        </div>
      </div>
    </article>
  );
}
function FamilyRow({ family, onAdd }: { family: Family; onAdd: (id: string) => void }) {
  return (
    <details className="rounded-md border border-slate-200 bg-white" open>
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        {family.rootRef}{' '}
        <span className="font-normal text-slate-500">
          — {family.totalCount} qismdan {family.matchCount} tasi mos
        </span>
      </summary>
      <div className="space-y-2 border-t border-slate-100 p-3">
        {family.parts.map((part) => (
          <label
            key={part.id}
            className={`flex gap-3 rounded p-2 text-sm ${part.matches ? 'bg-teal-50' : 'bg-slate-50 text-slate-500'}`}
          >
            <input type="checkbox" onChange={() => onAdd(part.id)} />
            <span>
              <strong>{part.displayRef}</strong> — {part.stem} ({part.marks} ball)
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}
function DependencyModal({
  dependencies,
  onClose,
  onAdd,
}: {
  dependencies: Dependency[];
  onClose: () => void;
  onAdd: (id: string, role: Role) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-20 grid place-items-center bg-slate-950/40 p-4"
    >
      <section className="w-full max-w-lg rounded-md bg-white p-5 shadow-xl">
        <h2 className="font-semibold">Bog‘liq savollar topildi</h2>
        <p className="mt-1 text-sm text-slate-600">Kerakli oldingi savolni savatchaga qo‘shing.</p>
        <div className="mt-4 space-y-3">
          {dependencies.map((d) => (
            <div key={d.id} className="rounded-md border border-slate-200 p-3">
              <strong className="text-sm">{d.displayRef}</strong>
              <p className="my-2 text-sm text-slate-600">{d.stem}</p>
              <div className="flex gap-2">
                <button onClick={() => onAdd(d.dependsOnId, 'graded')} className="small-button">
                  Baholanadigan
                </button>
                <button
                  disabled={d.kind === 'answer_ref'}
                  title={
                    d.kind === 'answer_ref'
                      ? 'Javobga bog‘liq savol faqat kontekst bo‘la olmaydi'
                      : ''
                  }
                  onClick={() => onAdd(d.dependsOnId, 'context_only')}
                  className="small-button"
                >
                  Faqat kontekst
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 text-sm font-medium text-slate-600">
          Yopish
        </button>
      </section>
    </div>
  );
}
function ReviewScreen({ review, onBack }: { review: Review; onBack: () => void }) {
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 flex h-14 items-center justify-between border-b bg-white px-5">
        <button onClick={onBack} className="text-sm font-medium">
          ← Bankka qaytish
        </button>
        <strong>{review.totalMarks} ball</strong>
      </header>
      <div className="mx-auto max-w-3xl space-y-6 p-8">
        {review.items.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-200 bg-white p-6">
            <div className="mb-4 flex justify-between">
              <strong>{item.freshRef}</strong>
              <span className="text-sm">
                {item.role === 'graded' ? `${item.effectiveMarks} ball` : 'Kontekst · 0 ball'}
              </span>
            </div>
            <ContextChain portable={item.portable} />
            <p className="mt-4 whitespace-pre-wrap">{item.portable.leaf.stem}</p>
            <footer className="mt-5 border-t pt-2 text-xs text-slate-500">
              Manba: {item.sourceRef}
            </footer>
          </article>
        ))}
      </div>
    </main>
  );
}
