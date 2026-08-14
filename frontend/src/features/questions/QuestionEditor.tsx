import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, type Topic } from '../../lib/api';
import { Latex } from '../../components/Latex';
import { renderLatex } from '../../lib/latex';

const COMMAND_WORDS = [
  'State',
  'Give',
  'Name',
  'Identify',
  'Define',
  'Describe',
  'Explain',
  'Compare',
  'Calculate',
  'Complete',
  'Draw',
  'Write',
  'Evaluate',
  'Justify',
  'Suggest',
  'Show',
  'Other',
] as const;

const SCHEME_TYPES = [
  ['all_required', 'Hammasi kerak'],
  ['any_n_from_m', 'N tadan M ta'],
  ['levels_of_response', 'Bandlar (levels of response)'],
  ['exact_match', 'Aniq moslik'],
  ['code_output', 'Kod natijasi'],
  ['manual_only', 'Faqat qo‘lda'],
] as const;

interface DraftPoint {
  code: string;
  textLatex: string;
  marks: number;
  accept: string;
  reject: string;
  requires: string;
}

const emptyPoint = (index: number): DraftPoint => ({
  code: `MP${index + 1}`,
  textLatex: '',
  marks: 1,
  accept: '',
  reject: '',
  requires: '',
});

const splitList = (value: string) =>
  value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);

interface AuthoringComponent {
  componentId: string;
  number: number;
  name: string;
  level: string;
  sourcePaperId: string;
}

interface QuestionEditorProps {
  topics: Topic[];
  onSaved: () => void;
}

/**
 * LaTeX authoring surface for the question bank.
 *
 * The preview renders with the very same `renderLatex` the student and the PDF
 * export use, so what the author validates here is exactly what gets marked.
 */
export function QuestionEditor({ topics, onSaved }: QuestionEditorProps) {
  const [components, setComponents] = useState<AuthoringComponent[]>([]);
  const [componentId, setComponentId] = useState('');
  const [displayRef, setDisplayRef] = useState('');
  const [path, setPath] = useState('');
  const [label, setLabel] = useState('');
  const [contextLatex, setContextLatex] = useState('');
  const [stemLatex, setStemLatex] = useState('');
  const [commandWord, setCommandWord] = useState<(typeof COMMAND_WORDS)[number]>('Explain');
  const [marks, setMarks] = useState(3);
  const [ao, setAo] = useState<'AO1' | 'AO2' | 'AO3'>('AO1');
  const [answerKind, setAnswerKind] = useState('text');
  const [answerLines, setAnswerLines] = useState(6);
  const [subtopicId, setSubtopicId] = useState('');
  const [schemeType, setSchemeType] = useState<(typeof SCHEME_TYPES)[number][0]>('all_required');
  const [groupLabel, setGroupLabel] = useState('');
  const [nRequired, setNRequired] = useState(3);
  const [guidanceLatex, setGuidanceLatex] = useState('');
  const [points, setPoints] = useState<DraftPoint[]>([emptyPoint(0)]);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [altText, setAltText] = useState('');
  const [error, setError] = useState('');
  const [findings, setFindings] = useState<Array<{ message: string; severity: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ data: AuthoringComponent[] }>('/questions/authoring-context')
      .then((response) => {
        setComponents(response.data);
        setComponentId((current) => current || (response.data[0]?.componentId ?? ''));
      })
      .catch(() => setError('Komponentlar yuklanmadi.'));
  }, []);

  const activeComponent = components.find((item) => item.componentId === componentId);
  const stemPreview = useMemo(() => renderLatex(stemLatex), [stemLatex]);
  const contextPreview = useMemo(() => renderLatex(contextLatex), [contextLatex]);
  const pointTotal = points.reduce((sum, point) => sum + Number(point.marks || 0), 0);

  const localWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (schemeType === 'all_required' && pointTotal !== marks) {
      warnings.push(`MP ballari yig‘indisi ${pointTotal}, savol balli ${marks}.`);
    }
    if (schemeType === 'any_n_from_m' && points.length <= nRequired) {
      warnings.push(`“${nRequired} tadan” uchun kamida ${nRequired + 1} ta MP kerak.`);
    }
    if (answerKind === 'diagram' && !svgMarkup.trim()) {
      warnings.push('Diagramma javob turi uchun SVG chizma majburiy.');
    }
    if (answerLines < marks && ['text', 'pseudocode'].includes(answerKind)) {
      warnings.push('V14: javob chiziqlari soni balldan kam.');
    }
    return warnings.concat(stemPreview.errors, contextPreview.errors);
  }, [
    answerKind,
    answerLines,
    contextPreview.errors,
    marks,
    nRequired,
    pointTotal,
    points.length,
    schemeType,
    stemPreview.errors,
    svgMarkup,
  ]);

  const updatePoint = (index: number, patch: Partial<DraftPoint>) =>
    setPoints((current) =>
      current.map((point, at) => (at === index ? { ...point, ...patch } : point)),
    );

  const save = async () => {
    setError('');
    setFindings([]);
    setSaving(true);
    try {
      if (!activeComponent) throw new Error('Komponent tanlanmagan');
      await api('/questions', {
        method: 'POST',
        body: JSON.stringify({
          sourcePaperId: activeComponent.sourcePaperId,
          componentId,
          label: label || path.split('.').at(-1) || '1',
          path,
          displayRef,
          stemLatex,
          contextLatex: contextLatex || null,
          bodyFormat: 'latex',
          commandWord,
          marks,
          ao,
          answerKind,
          answerLines,
          subtopicIds: [subtopicId],
          assets: svgMarkup.trim()
            ? [{ kind: 'diagram', altText: altText || 'Diagramma', svgMarkup, latexSource: null }]
            : [],
          markScheme: {
            schemeType,
            maxMarks: marks,
            guidanceLatex: guidanceLatex || null,
            groups:
              schemeType === 'any_n_from_m'
                ? [
                    {
                      label: groupLabel || `Any ${nRequired} from:`,
                      nRequired,
                      marksPerPoint: 1,
                      maxMarks: marks,
                    },
                  ]
                : [],
            points: points.map((point) => ({
              code: point.code,
              text: point.textLatex,
              textLatex: point.textLatex,
              marks: Number(point.marks),
              accept: splitList(point.accept),
              reject: splitList(point.reject),
              requires: splitList(point.requires),
              isBod: false,
              groupLabel:
                schemeType === 'any_n_from_m' ? groupLabel || `Any ${nRequired} from:` : null,
            })),
          },
        }),
      });
      onSaved();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        if (caught.details?.findings) setFindings(caught.details.findings);
      } else {
        setError('Saqlanmadi.');
      }
    } finally {
      setSaving(false);
    }
  };

  const subtopicOptions = topics.flatMap((topic) =>
    topic.subtopics.map((subtopic) => ({
      id: subtopic.id,
      label: `${subtopic.code} ${subtopic.title}`,
      topic: `${topic.number}. ${topic.title}`,
    })),
  );

  return (
    <section className="panel editor">
      <h2>Yangi savol</h2>

      <div className="editor-grid">
        <div className="editor-source">
          <div className="row">
            <label className="grow">
              Paper
              <select value={componentId} onChange={(event) => setComponentId(event.target.value)}>
                {components.map((component) => (
                  <option key={component.componentId} value={component.componentId}>
                    Paper {component.number} — {component.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="row">
            <label>
              Ref
              <input
                value={displayRef}
                placeholder="9618/12/M/J/23 Q3(b)"
                onChange={(event) => setDisplayRef(event.target.value)}
              />
            </label>
            <label>
              Path
              <input
                value={path}
                placeholder="3.b"
                onChange={(event) => setPath(event.target.value)}
              />
            </label>
            <label>
              Label
              <input
                value={label}
                placeholder="b"
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
          </div>

          <label>
            Kontekst (ota savol matni, ixtiyoriy) — LaTeX
            <textarea
              rows={3}
              value={contextLatex}
              onChange={(event) => setContextLatex(event.target.value)}
              placeholder="A company stores customer records in a relational database."
            />
          </label>

          <label>
            Savol matni — LaTeX
            <textarea
              rows={6}
              value={stemLatex}
              onChange={(event) => setStemLatex(event.target.value)}
              placeholder={'Convert $\\mathtt{10110101}_2$ into hexadecimal.'}
            />
            <small>
              Matematika uchun <code>$…$</code>, alohida qator uchun <code>$$…$$</code>. Chizma
              uchun quyidagi SVG maydonidan foydalaning.
            </small>
          </label>

          <div className="row">
            <label>
              Command word
              <select
                value={commandWord}
                onChange={(event) =>
                  setCommandWord(event.target.value as (typeof COMMAND_WORDS)[number])
                }
              >
                {COMMAND_WORDS.map((word) => (
                  <option key={word}>{word}</option>
                ))}
              </select>
            </label>
            <label>
              Ball
              <input
                type="number"
                min={1}
                max={30}
                value={marks}
                onChange={(event) => setMarks(Number(event.target.value))}
              />
            </label>
            <label>
              AO
              <select value={ao} onChange={(event) => setAo(event.target.value as typeof ao)}>
                <option>AO1</option>
                <option>AO2</option>
                <option>AO3</option>
              </select>
            </label>
          </div>

          <div className="row">
            <label>
              Javob turi
              <select value={answerKind} onChange={(event) => setAnswerKind(event.target.value)}>
                <option value="text">Matn</option>
                <option value="pseudocode">Pseudocode</option>
                <option value="code">Kod</option>
                <option value="table">Jadval</option>
                <option value="diagram">Diagramma</option>
                <option value="image">Rasm</option>
              </select>
            </label>
            <label>
              Javob chiziqlari
              <input
                type="number"
                min={0}
                max={60}
                value={answerLines}
                onChange={(event) => setAnswerLines(Number(event.target.value))}
              />
            </label>
            <label className="grow">
              Subtopic
              <select value={subtopicId} onChange={(event) => setSubtopicId(event.target.value)}>
                <option value="">Tanlang…</option>
                {subtopicOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend>Chizma (SVG, ixtiyoriy)</legend>
            <textarea
              rows={3}
              value={svgMarkup}
              onChange={(event) => setSvgMarkup(event.target.value)}
              placeholder="<svg viewBox='0 0 200 100'>…</svg>"
            />
            <input
              value={altText}
              placeholder="Chizma tavsifi (alt text)"
              onChange={(event) => setAltText(event.target.value)}
            />
          </fieldset>

          <fieldset>
            <legend>Mark scheme</legend>
            <div className="row">
              <label>
                Sxema turi
                <select
                  value={schemeType}
                  onChange={(event) =>
                    setSchemeType(event.target.value as (typeof SCHEME_TYPES)[number][0])
                  }
                >
                  {SCHEME_TYPES.map(([value, title]) => (
                    <option key={value} value={value}>
                      {title}
                    </option>
                  ))}
                </select>
              </label>
              {schemeType === 'any_n_from_m' && (
                <>
                  <label>
                    Nechtasi kerak
                    <input
                      type="number"
                      min={1}
                      value={nRequired}
                      onChange={(event) => setNRequired(Number(event.target.value))}
                    />
                  </label>
                  <label className="grow">
                    Guruh sarlavhasi
                    <input
                      value={groupLabel}
                      placeholder={`Any ${nRequired} from:`}
                      onChange={(event) => setGroupLabel(event.target.value)}
                    />
                  </label>
                </>
              )}
            </div>

            <label>
              Guidance (LaTeX, ixtiyoriy)
              <input
                value={guidanceLatex}
                placeholder="Max 2 marks if no example is given."
                onChange={(event) => setGuidanceLatex(event.target.value)}
              />
            </label>

            {points.map((point, index) => (
              <div className="mark-point" key={index}>
                <div className="row">
                  <label className="narrow">
                    Kod
                    <input
                      value={point.code}
                      onChange={(event) => updatePoint(index, { code: event.target.value })}
                    />
                  </label>
                  <label className="narrow">
                    Ball
                    <input
                      type="number"
                      min={0}
                      value={point.marks}
                      onChange={(event) =>
                        updatePoint(index, { marks: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label className="grow">
                    Mazmun (Cambridge so‘zlari bilan)
                    <input
                      value={point.textLatex}
                      onChange={(event) => updatePoint(index, { textLatex: event.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setPoints((current) => current.filter((_, at) => at !== index))}
                  >
                    ✕
                  </button>
                </div>
                <div className="row">
                  <label className="grow">
                    accept (har qatorda bittadan)
                    <textarea
                      rows={2}
                      value={point.accept}
                      onChange={(event) => updatePoint(index, { accept: event.target.value })}
                    />
                  </label>
                  <label className="grow">
                    reject
                    <textarea
                      rows={2}
                      value={point.reject}
                      onChange={(event) => updatePoint(index, { reject: event.target.value })}
                    />
                  </label>
                  <label className="narrow">
                    requires
                    <textarea
                      rows={2}
                      value={point.requires}
                      placeholder="MP1"
                      onChange={(event) => updatePoint(index, { requires: event.target.value })}
                    />
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="secondary"
              onClick={() => setPoints((current) => [...current, emptyPoint(current.length)])}
            >
              + Mark point
            </button>
          </fieldset>
        </div>

        <aside className="editor-preview">
          <h3>Ko‘rinishi</h3>
          <div className="question-card">
            <p className="ref">
              {displayRef || 'Ref kiritilmagan'} · {commandWord} · [{marks}]
            </p>
            {contextLatex && <Latex source={contextLatex} className="context" />}
            <Latex source={stemLatex} className="stem" />
            {svgMarkup.trim() && (
              <figure
                className="diagram"
                role="img"
                aria-label={altText || 'Diagramma'}
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            )}
            <div className="answer-lines">
              {Array.from({ length: Math.min(answerLines, 12) }, (_, line) => (
                <span key={line} />
              ))}
            </div>
          </div>

          <h3>Mark scheme</h3>
          <ol className="mp-preview">
            {points.map((point, index) => (
              <li key={index}>
                <strong>{point.code}</strong> <Latex source={point.textLatex} inline /> (
                {point.marks})
              </li>
            ))}
          </ol>
          <p className="muted">
            Jami: {pointTotal} / {marks}
          </p>

          {localWarnings.length > 0 && (
            <ul className="findings">
              {localWarnings.map((warning) => (
                <li key={warning}>⚠ {warning}</li>
              ))}
            </ul>
          )}
          {findings.length > 0 && (
            <ul className="findings">
              {findings.map((finding, index) => (
                <li key={index}>🔴 {finding.message}</li>
              ))}
            </ul>
          )}
          {error && <p className="form-error">{error}</p>}

          <button
            type="button"
            onClick={save}
            disabled={saving || !stemLatex || !subtopicId || !path || !activeComponent}
          >
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </aside>
      </div>
    </section>
  );
}
