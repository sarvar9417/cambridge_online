// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Lesson Studio board navigation contract',()=>{
  let pending: VoidFunction[];
  let observers: MutationObserver[];
  let cleanups: VoidFunction[];

  beforeEach(() => {
    vi.resetModules();
    pending = [];
    observers = [];
    cleanups = [];
    // Keep the real DOM observer, but bound its scheduled scans so a regression
    // fails an assertion instead of freezing the test runner's event loop.
    vi.stubGlobal('queueMicrotask', (callback: VoidFunction) => pending.push(callback));
    const NativeObserver = globalThis.MutationObserver;
    vi.stubGlobal('MutationObserver', class extends NativeObserver {
      constructor(callback: MutationCallback) { super(callback); observers.push(this); }
    });
  });

  afterEach(() => {
    cleanups.splice(0).reverse().forEach(cleanup => cleanup());
    observers.forEach(observer => observer.disconnect());
    document.body.replaceChildren();
    document.documentElement.classList.remove('lesson-presenting');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mountStudio(chapter: number) {
    document.body.innerHTML = `<section class="lesson-studio">
      <header><div class="lesson-toolbar-title"><span>AS · Chapter ${chapter}</span></div>
        <div class="lesson-toolbar-actions"></div></header>
      <aside class="lesson-outline"><button class="active"><span>01</span> Introduction</button>
        <button><span>02</span> Worked example</button></aside>
      <footer class="lesson-nav"><button>Previous</button><div>
        <button class="active" aria-label="1-slide"></button>
        <button aria-label="2-slide"></button>
        <button aria-label="3-slide"></button>
      </div><button>Next</button></footer>
    </section>`;
  }

  async function install() {
    const { installLessonStudioProfessionalControls } = await import('./lesson-studio-professional-controls');
    const cleanup = installLessonStudioProfessionalControls();
    cleanups.push(cleanup);
    return cleanup;
  }

  async function settle() {
    for (let scan = 0; scan < 8; scan += 1) {
      await Promise.resolve();
      if (!pending.length) return;
      pending.shift()!();
    }
    await Promise.resolve();
    expect(pending, 'the controls must not keep reacting to their own DOM writes').toHaveLength(0);
  }

  it.each([[1, 26], [7, 41], [13, 24]])('opens chapter %i and lets the observer settle', async (chapter, pages) => {
    mountStudio(chapter!);
    await install();
    await settle();

    expect(document.querySelector('.lesson-source-complete-badge')?.textContent)
      .toBe(`${pages}/${pages} supplied PDF pages audited`);
    expect(document.querySelector('.lesson-v3-nav-label')?.textContent).toBe('1 / 3 · Introduction');
    expect(document.querySelectorAll('.lesson-v3-nav-center')).toHaveLength(1);

    // Unrelated React rendering must not restart a self-sustaining scan loop.
    document.body.append(document.createElement('aside'));
    await settle();
    expect(document.querySelectorAll('.lesson-source-complete-badge')).toHaveLength(1);
    expect(document.querySelectorAll('.lesson-v3-nav-center')).toHaveLength(1);
  });

  it('updates slide navigation and remains responsive after a slider jump', async () => {
    mountStudio(1);
    await install();
    await settle();
    const dots = [...document.querySelectorAll<HTMLButtonElement>('.lesson-nav > div:not(.lesson-v3-nav-center) > button')];
    const sections = [...document.querySelectorAll('.lesson-outline button')];
    const jump = vi.fn(() => {
      dots.forEach((dot, index) => dot.classList.toggle('active', index === 1));
      sections.forEach((section, index) => section.classList.toggle('active', index === 1));
    });
    dots[1]!.addEventListener('click', jump);
    const range = document.querySelector<HTMLInputElement>('.lesson-v3-nav-range')!;
    range.value = '2';
    range.dispatchEvent(new Event('input'));
    await settle();

    expect(jump).toHaveBeenCalledOnce();
    expect(range.value).toBe('2');
    expect(range.getAttribute('aria-valuetext')).toBe('2 / 3 · Worked example');
    expect(document.querySelector('.lesson-v3-nav-label')?.textContent).toBe('2 / 3 · Worked example');
  });

  it('tears down global observers when the React owner unmounts and can install again', async () => {
    mountStudio(1);
    const firstCleanup = await install();
    await settle();
    expect(observers).toHaveLength(1);

    firstCleanup();
    cleanups = cleanups.filter(cleanup => cleanup !== firstCleanup);
    expect(document.documentElement.classList.contains('lesson-presenting')).toBe(false);

    await install();
    await settle();
    expect(observers).toHaveLength(2);
    expect(document.querySelectorAll('.lesson-v3-nav-center')).toHaveLength(1);
    expect(document.querySelectorAll('.lesson-source-complete-badge')).toHaveLength(1);
  });
});
