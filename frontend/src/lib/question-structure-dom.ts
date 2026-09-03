import { api } from './api';
import { structureQuestionText, type QuestionTextBlock } from './question-structure';
import {
  cleanExamStem,
  parseChoiceQuestion,
  parseWordBankQuestion,
  responseKindFor,
} from './question-workspace';

const TARGETS = [
  '.question > h2',
  '.qb-question-main > p',
  '.qb-family-parts article > div > p',
  '.qb-basket-item > p',
  '.qb-leaf-preview > p',
  '.qb-review-stem',
  '.qb-dependency-list article > p',
  '.qb-context-list section > p',
  '.lesson-exam-card > p',
  '.gq-stem',
  '.sr-stem',
  '.appeal-list article > div > p:not(.appeal-reason)',
  '[class*="question-stem"]',
  '[class$="-stem"]',
].join(',');

type CheckpointPart = { id: string; displayRef: string };
type CheckpointResponse = { data: CheckpointPart[] };

type MarkSchemePoint = {
  code: string;
  text: string;
  marks: number;
  accept?: unknown;
  reject?: unknown;
  requires?: unknown;
  isBod?: boolean;
};

type MarkScheme = {
  schemeType: string;
  maxMarks: number;
  guidanceMd?: string | null;
  points?: MarkSchemePoint[];
  groups?: Array<{ label?: string | null; nRequired?: number | null; marksPerPoint?: number | null; maxMarks?: number | null }>;
};

type QuestionDetail = {
  id: string;
  displayRef: string;
  stemMd: string | null;
  contextMd: string | null;
  commandWord: string | null;
  marks: number;
  answerKind: string;
  markScheme?: MarkScheme;
};

type PortableAsset = {
  id: string;
  kind: string;
  url: string | null;
  contentMd: string | null;
  altText: string;
  sourcePage: number | null;
};

type PortableQuestion = {
  leaf: {
    id: string;
    displayRef: string;
    stem: string;
    commandWord: string | null;
    marks: number;
    answerKind: string;
    answerLines: number | null;
  };
  contextBlocks: Array<{
    id: string;
    displayRef: string;
    context: string | null;
    assets: PortableAsset[];
  }>;
  dependencies: Array<{
    displayRef: string;
    stem: string | null;
    kind: string;
    strength: string;
    evidence: string | null;
  }>;
};

function span(className: string, text?: string) {
  const node = document.createElement('span');
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className: string, text: string) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = text;
  return node;
}

function renderBlock(block: QuestionTextBlock) {
  if (block.type === 'code') {
    const wrapper = span('qtext-block qtext-code');
    const code = document.createElement('code');
    code.textContent = block.text;
    wrapper.append(code);
    return wrapper;
  }

  if (block.type === 'list') {
    const wrapper = span('qtext-block qtext-list');
    for (const item of block.items) {
      const row = span('qtext-list-item');
      const bullet = span('qtext-list-bullet', '•');
      bullet.setAttribute('aria-hidden', 'true');
      row.append(bullet, document.createTextNode(item));
      wrapper.append(row);
    }
    return wrapper;
  }

  if (block.type === 'table') {
    const wrapper = span('qtext-block qtext-table');
    for (const rowText of block.rows) wrapper.append(span('qtext-table-row', rowText));
    return wrapper;
  }

  return span(`qtext-block ${block.type === 'task' ? 'qtext-task' : 'qtext-paragraph'}`, block.text);
}

function renderQuestionText(target: HTMLElement, text: string) {
  target.classList.add('qtext-host');
  const fragment = document.createDocumentFragment();
  const blocks = structureQuestionText(cleanExamStem(text));
  if (!blocks.length) {
    target.textContent = '';
    return;
  }
  blocks.forEach((block) => fragment.append(renderBlock(block)));
  target.replaceChildren(fragment);
}

function sourceText(element: Element) {
  return (element.textContent ?? '').replace(/\r\n?/g, '\n').trim();
}

function enhance(element: Element) {
  if (element.closest('.attempt-context')) return;
  // If semantic children are still present, this node is already enhanced.
  // When React replaces them with raw text during a route/question change the
  // guard becomes false and the same source can be enhanced again safely.
  if (element.querySelector(':scope > .qtext-block')) return;
  const source = sourceText(element);
  if (!source) return;

  const blocks = structureQuestionText(source);
  element.classList.add('qtext-host');

  // A single ordinary paragraph needs no extra DOM. The host class still
  // preserves meaningful line breaks without changing the source text.
  if (blocks.length === 1 && blocks[0]?.type === 'paragraph') return;

  const fragment = document.createDocumentFragment();
  blocks.forEach((block) => fragment.append(renderBlock(block)));
  element.replaceChildren(fragment);
}

const questionIdCache = new Map<string, string>();
const questionDetailCache = new Map<string, Promise<[QuestionDetail, PortableQuestion]>>();
let workspaceRequest = 0;

function normalized(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function cardDisplayRef(card: Element) {
  return normalized(card.querySelector('.lesson-exam-meta span')?.textContent ?? '');
}

function cardYear(card: Element) {
  const group = card.closest('.lesson-exam-year-group');
  const value = Number(group?.querySelector('.lesson-exam-year-header strong')?.textContent ?? '');
  return Number.isInteger(value) ? value : 0;
}

function cardLoCodes(card: Element) {
  const footer = card.querySelector('footer span:last-child')?.textContent ?? '';
  const codes = footer.match(/\b\d+(?:\.\d+)*-lo-\d+\b/g) ?? [];
  if (codes.length) return [...new Set(codes)];
  const contract = card.closest('.lesson-studio')?.querySelector('.lesson-checkpoint-contract strong')?.textContent ?? '';
  return [...new Set(contract.match(/\b\d+(?:\.\d+)*-lo-\d+\b/g) ?? [])];
}

async function resolveQuestionId(card: Element) {
  const displayRef = cardDisplayRef(card);
  if (!displayRef) throw new Error('Savol manbasi aniqlanmadi.');
  const cached = questionIdCache.get(displayRef);
  if (cached) return cached;

  const loCodes = cardLoCodes(card);
  if (!loCodes.length) throw new Error('Learning objective kodi topilmadi.');
  const year = cardYear(card);
  const query = new URLSearchParams({
    yearFrom: String(year || 2021),
    yearTo: String(year || 2025),
  });
  loCodes.forEach((code) => query.append('loCodes', code));
  const checkpoint = await api<CheckpointResponse>(`/lesson-checkpoints?${query}`);
  const match = checkpoint.data.find((item) => normalized(item.displayRef) === displayRef);
  if (!match) throw new Error('Savolning to‘liq yozuvi topilmadi.');
  questionIdCache.set(displayRef, match.id);
  return match.id;
}

async function loadQuestion(card: Element) {
  const id = await resolveQuestionId(card);
  let cached = questionDetailCache.get(id);
  if (!cached) {
    cached = Promise.all([
      api<QuestionDetail>(`/questions/${id}`),
      api<PortableQuestion>(`/questions/${id}/portable`),
    ]);
    questionDetailCache.set(id, cached);
  }
  return cached;
}

function renderUnknownList(value: unknown) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => String(item)).join(' · ');
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function renderMarkScheme(detail: QuestionDetail) {
  const section = document.createElement('section');
  section.className = 'lesson-workspace-scheme';
  const scheme = detail.markScheme;
  if (!scheme) {
    const empty = document.createElement('p');
    empty.textContent = 'Approved mark scheme bu savol uchun topilmadi.';
    section.append(empty);
    return section;
  }

  const heading = document.createElement('div');
  heading.className = 'lesson-workspace-section-heading';
  const title = document.createElement('strong');
  title.textContent = 'Official mark scheme';
  const meta = span('lesson-workspace-scheme-meta', `${scheme.schemeType.replaceAll('_', ' ')} · ${scheme.maxMarks} mark`);
  heading.append(title, meta);
  section.append(heading);

  if (scheme.guidanceMd) {
    const guidance = document.createElement('p');
    guidance.className = 'lesson-workspace-guidance';
    guidance.textContent = scheme.guidanceMd;
    section.append(guidance);
  }

  if (scheme.groups?.length) {
    const groups = document.createElement('div');
    groups.className = 'lesson-workspace-scheme-groups';
    for (const group of scheme.groups) {
      const item = document.createElement('span');
      item.textContent = [
        group.label,
        group.nRequired ? `${group.nRequired} required` : '',
        group.maxMarks ? `${group.maxMarks} max` : '',
      ].filter(Boolean).join(' · ');
      groups.append(item);
    }
    section.append(groups);
  }

  const list = document.createElement('ol');
  list.className = 'lesson-workspace-mark-points';
  for (const point of scheme.points ?? []) {
    const item = document.createElement('li');
    const row = document.createElement('div');
    const code = span('lesson-workspace-mp-code', point.code);
    const marks = span('lesson-workspace-mp-marks', `${point.marks} mark`);
    row.append(code, marks);
    const text = document.createElement('p');
    text.textContent = point.text;
    item.append(row, text);
    const accept = renderUnknownList(point.accept);
    const reject = renderUnknownList(point.reject);
    if (accept || reject) {
      const notes = document.createElement('small');
      notes.textContent = [accept ? `Accept: ${accept}` : '', reject ? `Reject: ${reject}` : ''].filter(Boolean).join(' · ');
      item.append(notes);
    }
    list.append(item);
  }
  section.append(list);
  return section;
}

function responseHeader(label: string, note: string) {
  const header = document.createElement('div');
  header.className = 'lesson-workspace-section-heading';
  const title = document.createElement('strong');
  title.textContent = label;
  const hint = document.createElement('span');
  hint.textContent = note;
  header.append(title, hint);
  return header;
}

function renderChoiceResponse(stem: string, target: HTMLElement) {
  const parsed = parseChoiceQuestion(stem);
  if (!parsed) return false;
  const prompt = document.createElement('div');
  prompt.className = 'lesson-workspace-stem';
  renderQuestionText(prompt, parsed.prompt);
  target.append(prompt);

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'lesson-workspace-choice-grid';
  const legend = document.createElement('legend');
  legend.textContent = parsed.kind === 'single'
    ? 'Bitta javobni tanlang'
    : `Ko‘pi bilan ${parsed.maxSelections} ta javobni tanlang`;
  fieldset.append(legend);
  const name = `lesson-choice-${Math.random().toString(36).slice(2)}`;
  for (const option of parsed.options) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = parsed.kind === 'single' ? 'radio' : 'checkbox';
    input.name = name;
    input.value = option.key;
    const key = span('lesson-workspace-choice-key', option.key);
    const text = span('lesson-workspace-choice-text', option.text);
    label.append(input, key, text);
    fieldset.append(label);
  }
  if (parsed.kind === 'multiple') {
    fieldset.addEventListener('change', () => {
      const inputs = [...fieldset.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
      const selected = inputs.filter((input) => input.checked).length;
      inputs.forEach((input) => { input.disabled = !input.checked && selected >= parsed.maxSelections; });
    });
  }
  target.append(fieldset);
  return true;
}

function renderWordBankResponse(stem: string, marks: number, target: HTMLElement) {
  const parsed = parseWordBankQuestion(stem, marks);
  if (!parsed) return false;
  const prompt = document.createElement('div');
  prompt.className = 'lesson-workspace-stem';
  renderQuestionText(prompt, parsed.prompt);
  target.append(prompt);

  const bank = document.createElement('div');
  bank.className = 'lesson-workspace-word-bank';
  const label = span('lesson-workspace-word-bank-label', 'WORD BANK');
  const values = document.createElement('p');
  values.textContent = parsed.bankText;
  bank.append(label, values);
  target.append(bank);

  const passage = document.createElement('div');
  passage.className = 'lesson-workspace-passage';
  passage.textContent = parsed.passage;
  target.append(passage);

  const slots = document.createElement('div');
  slots.className = 'lesson-workspace-answer-slots';
  slots.append(responseHeader('Javoblaringiz', 'Har bir bo‘sh joy uchun bitta termin yozing.'));
  for (let index = 0; index < parsed.slots; index += 1) {
    const row = document.createElement('label');
    const number = span('lesson-workspace-slot-number', String(index + 1));
    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.placeholder = `Answer ${index + 1}`;
    row.append(number, input);
    slots.append(row);
  }
  target.append(slots);
  return true;
}

function renderGenericResponse(detail: QuestionDetail, portable: PortableQuestion, target: HTMLElement) {
  const kind = responseKindFor(detail.stemMd ?? portable.leaf.stem, detail.answerKind ?? portable.leaf.answerKind, detail.marks);
  const response = document.createElement('section');
  response.className = 'lesson-workspace-response';
  response.append(responseHeader('Practice answer', 'Bu Lesson Studio maydoni; javob assignmentga yuborilmaydi.'));

  if (kind === 'table') {
    const grid = document.createElement('div');
    grid.className = 'lesson-workspace-table-answer';
    const count = Math.max(2, detail.marks);
    for (let index = 0; index < count; index += 1) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Cell / answer ${index + 1}`;
      grid.append(input);
    }
    response.append(grid);
  } else if (kind === 'diagram') {
    const note = document.createElement('div');
    note.className = 'lesson-workspace-drawing-note';
    note.innerHTML = '<strong>Chizma talab qilinadi</strong><span>Diagrammani doskada yoki qog‘ozda bajaring; pastdagi maydonga izoh yoki label-larni yozishingiz mumkin.</span>';
    const textarea = document.createElement('textarea');
    textarea.rows = 5;
    textarea.placeholder = 'Diagram labels / notes';
    response.append(note, textarea);
  } else {
    const textarea = document.createElement('textarea');
    textarea.rows = kind === 'code'
      ? Math.max(8, Math.min(18, portable.leaf.answerLines ?? detail.marks * 3))
      : Math.max(3, Math.min(12, portable.leaf.answerLines ?? detail.marks * 2));
    textarea.placeholder = kind === 'code' ? 'Pseudocode / program code' : 'Javobni shu yerga yozing';
    if (kind === 'code') textarea.className = 'lesson-workspace-code-answer';
    response.append(textarea);
  }

  target.append(response);
}

function renderAsset(asset: PortableAsset) {
  const wrapper = document.createElement('figure');
  wrapper.className = 'lesson-workspace-asset';
  if (asset.url) {
    const image = document.createElement('img');
    image.src = asset.url;
    image.alt = asset.altText || 'Question asset';
    wrapper.append(image);
  }
  if (asset.contentMd) {
    const content = document.createElement('div');
    content.className = 'lesson-workspace-asset-content';
    renderQuestionText(content, asset.contentMd);
    wrapper.append(content);
  }
  if (asset.altText || asset.sourcePage) {
    const caption = document.createElement('figcaption');
    caption.textContent = [asset.altText, asset.sourcePage ? `Source page ${asset.sourcePage}` : ''].filter(Boolean).join(' · ');
    wrapper.append(caption);
  }
  return wrapper;
}

function renderContext(portable: PortableQuestion) {
  const section = document.createElement('section');
  section.className = 'lesson-workspace-contexts';
  const useful = portable.contextBlocks.filter((block) => block.context || block.assets.length);
  if (!useful.length) return section;
  section.append(responseHeader('Question context', 'Parent context va source assetlar savol bilan birga ko‘rsatiladi.'));
  for (const block of useful) {
    const article = document.createElement('article');
    const ref = document.createElement('strong');
    ref.textContent = block.displayRef;
    article.append(ref);
    if (block.context) {
      const context = document.createElement('div');
      renderQuestionText(context, block.context);
      article.append(context);
    }
    block.assets.forEach((asset) => article.append(renderAsset(asset)));
    section.append(article);
  }
  return section;
}

function renderDependencies(portable: PortableQuestion) {
  if (!portable.dependencies.length) return null;
  const aside = document.createElement('aside');
  aside.className = 'lesson-workspace-dependencies';
  const title = document.createElement('strong');
  title.textContent = 'Dependency';
  aside.append(title);
  for (const dependency of portable.dependencies) {
    const row = document.createElement('p');
    row.textContent = `${dependency.displayRef} · ${dependency.kind} · ${dependency.strength}${dependency.evidence ? ` · ${dependency.evidence}` : ''}`;
    aside.append(row);
  }
  return aside;
}

function ensureWorkspaceDialog(host: Element) {
  let dialog = document.querySelector<HTMLDialogElement>('.lesson-question-workspace');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'lesson-question-workspace';
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  if (dialog.parentElement !== host) host.append(dialog);
  return dialog;
}

function workspaceHeader(displayRef: string, marksText: string, ordinal: string) {
  const header = document.createElement('header');
  header.className = 'lesson-workspace-header';
  const identity = document.createElement('div');
  const kicker = document.createElement('span');
  kicker.textContent = ordinal;
  const title = document.createElement('h2');
  title.textContent = displayRef;
  identity.append(kicker, title);
  const marks = span('lesson-workspace-marks', marksText);
  header.append(identity, marks);
  return header;
}

async function openLessonQuestion(card: Element) {
  const host = card.closest('.lesson-studio') ?? document.body;
  const dialog = ensureWorkspaceDialog(host);
  const cards = [...document.querySelectorAll('.lesson-exam-card')];
  const currentIndex = Math.max(0, cards.indexOf(card));
  const displayRef = cardDisplayRef(card);
  const marksText = card.querySelector('.lesson-exam-meta b')?.textContent ?? '';
  const request = ++workspaceRequest;

  const loading = document.createElement('div');
  loading.className = 'lesson-workspace-loading';
  loading.append(workspaceHeader(displayRef, marksText, `Savol ${currentIndex + 1} / ${cards.length}`));
  const loadingText = document.createElement('p');
  loadingText.textContent = 'Savol, source context va mark scheme yuklanmoqda…';
  loading.append(loadingText);
  dialog.replaceChildren(loading);
  if (!dialog.open) dialog.showModal();

  try {
    const [detail, portable] = await loadQuestion(card);
    if (request !== workspaceRequest) return;

    const shell = document.createElement('div');
    shell.className = 'lesson-workspace-shell';
    shell.append(workspaceHeader(displayRef, `${detail.marks} mark`, `Savol ${currentIndex + 1} / ${cards.length}`));

    const close = button('lesson-workspace-close', 'Yopish');
    close.setAttribute('aria-label', 'Savol oynasini yopish');
    close.addEventListener('click', () => dialog.close());
    shell.append(close);

    const toolbar = document.createElement('div');
    toolbar.className = 'lesson-workspace-toolbar';
    const source = span('lesson-workspace-source', `${cardYear(card)} · ${detail.commandWord ?? 'Question'} · ${detail.answerKind}`);
    const lo = span('lesson-workspace-lo', cardLoCodes(card).join(' · '));
    toolbar.append(source, lo);
    shell.append(toolbar);

    const body = document.createElement('div');
    body.className = 'lesson-workspace-body';
    const questionColumn = document.createElement('main');
    questionColumn.className = 'lesson-workspace-question-column';
    const sideColumn = document.createElement('aside');
    sideColumn.className = 'lesson-workspace-side-column';

    const context = renderContext(portable);
    if (context.childElementCount) questionColumn.append(context);

    const stemSection = document.createElement('section');
    stemSection.className = 'lesson-workspace-question';
    stemSection.append(responseHeader('Exam question', 'Cambridge source wording saqlanadi; PDF margin artefaktlari yashiriladi.'));
    const stem = detail.stemMd ?? portable.leaf.stem;
    const responseKind = responseKindFor(stem, detail.answerKind ?? portable.leaf.answerKind, detail.marks);
    if (responseKind === 'choice') renderChoiceResponse(stem, stemSection);
    else if (responseKind === 'word_bank') renderWordBankResponse(stem, detail.marks, stemSection);
    else {
      const stemBody = document.createElement('div');
      stemBody.className = 'lesson-workspace-stem';
      renderQuestionText(stemBody, stem);
      stemSection.append(stemBody);
      renderGenericResponse(detail, portable, stemSection);
    }
    questionColumn.append(stemSection);

    const dependency = renderDependencies(portable);
    if (dependency) sideColumn.append(dependency);

    const reveal = button('lesson-workspace-reveal', 'Mark schemeni ko‘rsatish');
    const scheme = renderMarkScheme(detail);
    scheme.hidden = true;
    reveal.addEventListener('click', () => {
      scheme.hidden = !scheme.hidden;
      reveal.textContent = scheme.hidden ? 'Mark schemeni ko‘rsatish' : 'Mark schemeni yashirish';
    });
    sideColumn.append(reveal, scheme);

    body.append(questionColumn, sideColumn);
    shell.append(body);

    const navigation = document.createElement('nav');
    navigation.className = 'lesson-workspace-navigation';
    const previous = button('lesson-workspace-nav', '← Oldingi savol');
    const next = button('lesson-workspace-nav', 'Keyingi savol →');
    previous.disabled = currentIndex === 0;
    next.disabled = currentIndex >= cards.length - 1;
    previous.addEventListener('click', () => {
      const target = cards[currentIndex - 1];
      if (target) void openLessonQuestion(target);
    });
    next.addEventListener('click', () => {
      const target = cards[currentIndex + 1];
      if (target) void openLessonQuestion(target);
    });
    navigation.append(previous, next);
    shell.append(navigation);
    dialog.replaceChildren(shell);
  } catch (cause) {
    if (request !== workspaceRequest) return;
    const error = document.createElement('div');
    error.className = 'lesson-workspace-error';
    error.append(workspaceHeader(displayRef, marksText, `Savol ${currentIndex + 1} / ${cards.length}`));
    const message = document.createElement('p');
    message.textContent = cause instanceof Error ? cause.message : 'Savol ochilmadi.';
    const close = button('lesson-workspace-close-error', 'Yopish');
    close.addEventListener('click', () => dialog.close());
    error.append(message, close);
    dialog.replaceChildren(error);
  }
}

function enhanceLessonCard(card: Element) {
  const article = card as HTMLElement;
  if (article.dataset.questionWorkspaceReady === 'true') return;
  article.dataset.questionWorkspaceReady = 'true';
  article.classList.add('lesson-exam-launcher');
  const actions = document.createElement('div');
  actions.className = 'lesson-question-card-actions';
  const open = button('lesson-question-open', 'Savolni ochish');
  open.addEventListener('click', (event) => {
    event.stopPropagation();
    void openLessonQuestion(card);
  });
  actions.append(open);
  article.append(actions);
}

function scan(root: ParentNode = document) {
  if (root instanceof Element && root.matches(TARGETS)) enhance(root);
  root.querySelectorAll?.(TARGETS).forEach(enhance);
  if (root instanceof Element && root.matches('.lesson-exam-card')) enhanceLessonCard(root);
  root.querySelectorAll?.('.lesson-exam-card').forEach(enhanceLessonCard);
}

/**
 * Progressive enhancement for every current Cambridge question-paper surface.
 *
 * Existing React screens keep their source strings and APIs unchanged. This
 * layer only changes presentation, so grading/search/source provenance cannot
 * be affected. Lesson Studio cards additionally get a focused, teacher-only
 * practice workspace that loads the existing portable source context and
 * approved mark scheme on demand. A MutationObserver covers modal/route content
 * rendered after initial page load.
 */
export function installQuestionStructureEnhancer() {
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      scan(document);
    });
  };

  scan(document);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  return () => {
    observer.disconnect();
    document.querySelector<HTMLDialogElement>('.lesson-question-workspace')?.remove();
  };
}
