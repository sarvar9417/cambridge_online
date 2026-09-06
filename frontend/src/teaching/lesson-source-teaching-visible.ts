import {
  sourceTeachingAtomsForSlide,
  sourceTeachingIsTask,
  sourceTeachingIsWorked,
  sourceTeachingKindLabel,
  type SourceTeachingAtom,
  type SourceTeachingChapter,
} from './lesson-source-teaching-model';
import './lesson-source-teaching-material.css';

let installed = false;
let scheduled = false;

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', value?: string) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}

function chapterNumber(studio: Element): SourceTeachingChapter | null {
  const label = studio.querySelector('.lesson-toolbar-title span')?.textContent ?? '';
  const value = Number(label.match(/Chapter\s+(\d+)/i)?.[1] ?? 0);
  return value === 1 || value === 7 || value === 13 ? value : null;
}

function currentSlideIndex(studio: Element) {
  const counters = [...studio.querySelectorAll<HTMLElement>('.lesson-toolbar-actions > span')];
  const value = counters.map(item=>item.textContent?.trim() ?? '').find(item=>/^\d+\s*\/\s*\d+$/.test(item)) ?? '';
  const position = Number(value.match(/^(\d+)\s*\//)?.[1] ?? 0);
  return Number.isInteger(position) && position > 0 ? position - 1 : -1;
}

function renderAtom(atom: SourceTeachingAtom) {
  const article = node('article', `lesson-source-teaching-card source-kind-${atom.kind}`);
  article.dataset.sourceAtomId = atom.id;

  const header = node('header');
  const identity = node('div');
  identity.append(
    node('span', '', sourceTeachingKindLabel(atom.kind)),
    node('strong', '', atom.sourceRef),
  );
  header.append(identity, node('small', '', atom.pageLabel));
  article.append(header);

  if (atom.lines.length) {
    const list = document.createElement(sourceTeachingIsWorked(atom.kind) || sourceTeachingIsTask(atom.kind) ? 'ol' : 'ul');
    atom.lines.forEach((line) => list.append(node('li', '', line)));
    article.append(list);
  }
  return article;
}

function renderSection(atoms: SourceTeachingAtom[], slideId: string) {
  const section = node('section', 'lesson-source-teaching');
  section.dataset.sourceTeachingSlide = slideId;
  section.setAttribute('aria-label', 'Complete textbook source material');

  const heading = node('header', 'lesson-source-teaching-heading');
  const title = node('div');
  title.append(
    node('span', '', 'TEXTBOOK SOURCE'),
    node('strong', '', 'Source material for this teaching step'),
  );
  heading.append(title, node('small', '', `${atoms.length} source item${atoms.length === 1 ? '' : 's'}`));
  const grid = node('div', 'lesson-source-teaching-grid');
  atoms.forEach((atom) => grid.append(renderAtom(atom)));
  section.append(heading, grid);
  return section;
}

/** Resolve the active slide from the same ordered chapter data used by React. */
async function resolveSlideId(chapter: SourceTeachingChapter, index: number) {
  if (chapter === 7) {
    const { CHAPTER_7 } = await import('./lesson-content-chapter7-complete');
    return CHAPTER_7.slides[index]?.id ?? '';
  }
  const { lessonChapter } = await import('./lesson-content-source-complete');
  return lessonChapter(chapter)?.slides[index]?.id ?? '';
}

async function enhance(studio: HTMLElement) {
  const chapter = chapterNumber(studio);
  if (!chapter) return;
  const index = currentSlideIndex(studio);
  if (index < 0) return;

  const slideId = await resolveSlideId(chapter, index);
  // A quick keyboard/page change can happen while the dynamic chapter module is
  // resolving. Never attach the previous slide's source block to the new slide.
  if (!slideId || currentSlideIndex(studio) !== index) return;

  const slide = studio.querySelector<HTMLElement>('.lesson-slide');
  if (!slide || slide.classList.contains('lesson-slide-exam')) return;
  const host = slide.querySelector<HTMLElement>(chapter === 7 ? '.ch7-copy' : '.hodder-copy');
  if (!host) return;

  const existing = host.querySelector<HTMLElement>('.lesson-source-teaching');
  const atoms = sourceTeachingAtomsForSlide(chapter, slideId);
  if (!atoms.length) {
    existing?.remove();
    return;
  }
  if (existing?.dataset.sourceTeachingSlide === slideId) return;

  const source = renderSection(atoms, slideId);
  const trace = host.querySelector('.lesson-source-trace');
  if (trace) host.insertBefore(source, trace);
  else host.append(source);
  existing?.remove();
}

function scan() {
  document.querySelectorAll<HTMLElement>('.lesson-studio').forEach((studio) => void enhance(studio));
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    scan();
  });
}

/**
 * Main-canvas source visibility enhancer.
 *
 * Source registries/fingerprints remain audit infrastructure; this enhancer is
 * the presentation contract that makes every mapped PDF atom visible without
 * opening a source drawer or transcript.
 */
export function installLessonSourceTeachingVisibility() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

installLessonSourceTeachingVisibility();
