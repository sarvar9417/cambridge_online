import { structureQuestionText, type QuestionTextBlock } from './question-structure';

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

function span(className: string, text?: string) {
  const node = document.createElement('span');
  node.className = className;
  if (text !== undefined) node.textContent = text;
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

function scan(root: ParentNode = document) {
  if (root instanceof Element && root.matches(TARGETS)) enhance(root);
  root.querySelectorAll?.(TARGETS).forEach(enhance);
}

/**
 * Progressive enhancement for every current Cambridge question-paper surface.
 *
 * Existing React screens keep their source strings and APIs unchanged. This
 * layer only changes presentation, so grading/search/source provenance cannot
 * be affected. A MutationObserver also covers modal/route content rendered
 * after initial page load.
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
  return () => observer.disconnect();
}
