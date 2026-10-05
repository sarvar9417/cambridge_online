import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, type User } from './lib/api';
import { QuestionBankPage } from './QuestionBankPage';

vi.mock('./lib/api', async importOriginal => ({
  ...await importOriginal<typeof import('./lib/api')>(),
  api: vi.fn(),
}));

const teacher: User = {
  id: 'teacher', fullName: 'Teacher', role: 'teacher', schoolId: 'school',
};

describe('Question Bank keyboard shortcuts', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.mocked(api).mockImplementation(async url => {
      if (url === '/questions/filter-options') return {
        syllabi: [{ code: '9618', subject: 'Computer Science', question_count: 1 }],
        components: [], topics: [], classes: [],
      } as never;
      if (url === '/selections') return [] as never;
      throw new Error(`Unexpected request: ${url}`);
    });
    window.history.replaceState(null, '', '/#oqitish/savol-banki');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('allows slashes inside the reference search but keeps the page shortcut', async () => {
    await act(async () => root.render(<QuestionBankPage user={teacher} />));
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Savol matnidan qidirish"]')!;

    const typingSlash = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    input.dispatchEvent(typingSlash);
    expect(typingSlash.defaultPrevented).toBe(false);

    input.blur();
    const shortcutSlash = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.body.dispatchEvent(shortcutSlash);
    expect(shortcutSlash.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
  });
});
