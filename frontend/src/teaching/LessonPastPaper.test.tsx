import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { LessonPastPaper } from './LessonPastPaper';

vi.mock('../lib/api', () => ({ api: vi.fn() }));
vi.mock('./lesson-course-catalog', () => ({ lessonCatalogChapter: () => null }));
vi.mock('./lesson-chapter-past-paper-scope', () => ({ chapterPastPaperScope: () => ({
  learningObjectiveCodes: ['1.1.1'], syllabusCodes: ['9618'], yearFrom: 2021, yearTo: 2025,
}) }));

const topic = { code: '1.1', title: 'Data representation', pages: [] };
const questions = ['first', 'second'].map((id, index) => ({
  id, displayRef: `9618 Q${index + 1}`, stem: `Question ${index + 1}`, contextMd: null,
  commandWord: 'Explain', marks: 2, year: 2021, series: 'June', variant: 1, component: 1,
  hasDiagram: false, hasDependency: false, contextBlocks: [], dependencies: [],
  markSchemePoints: [{ code: 'MP1', text: 'A valid explanation', marks: 2 }],
}));

describe('Past Paper drafts', () => {
  let root: Root;
  let container: HTMLDivElement;
  const answer = () => container.querySelector<HTMLTextAreaElement>('textarea')!;
  const render = async (userId = 'learner-one') => {
    const props = { page: null, topic, audience: 'student' as const, userId };
    await act(async () => root.render(<LessonPastPaper {...props} />));
  };
  const write = async (value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(answer(), value);
      answer().dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const click = async (selector: string) => {
    await act(async () => container.querySelector<HTMLButtonElement>(selector)!.click());
  };

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    vi.mocked(api).mockResolvedValue({ data: questions });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('keeps independent drafts and resets the scheme when switching questions', async () => {
    await render();
    await write('First explanation');
    await click('.lx-scheme-actions button');
    expect(container.querySelector('.lx-mark-scheme')).not.toBeNull();
    await click('[aria-label="Next question"]');
    expect(answer().value).toBe('');
    expect(container.querySelector('.lx-mark-scheme')).toBeNull();
    await write('Second explanation');
    await click('[aria-label="Previous question"]');
    expect(answer().value).toBe('First explanation');
    await click('[aria-label="Next question"]');
    expect(answer().value).toBe('Second explanation');
  });

  it('restores drafts after remount without sharing them with another account', async () => {
    await render();
    await write('Private learner explanation');
    await act(async () => root.render(null));
    await render();
    expect(answer().value).toBe('Private learner explanation');
    await render('learner-two');
    expect(answer().value).toBe('');
    await write('Another learner explanation');
    await render();
    expect(answer().value).toBe('Private learner explanation');
  });

  it('does not assign an unowned legacy draft to the current account', async () => {
    localStorage.setItem('campath:past-paper-answer:first', 'Unknown account answer');
    await render();
    expect(answer().value).toBe('');
  });
});
