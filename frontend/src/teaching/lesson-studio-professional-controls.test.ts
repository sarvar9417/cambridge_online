// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookCompletenessAudit } from './book-completeness-audit';

describe('Lesson Studio board navigation contract',()=>{
  let pending: VoidFunction[];
  let observers: MutationObserver[];
  let cleanups: VoidFunction[];

  beforeEach(() => {
    vi.resetModules();
    pending = [];
    observers = [];
    cleanups = [];
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

  function mountTopicStudio(chapter:number){
    document.body.innerHTML=`<section class="lesson-studio lesson-topic-studio">
      <header><div class="lesson-toolbar-title"><span>AS · Chapter ${chapter} · 1.1</span></div>
        <div class="lesson-toolbar-actions"></div></header>
      <aside class="lesson-outline lesson-topic-outline">
        <section class="lesson-topic-nav-group active">
          <button class="lesson-topic-nav-topic"><span>1.1</span><b>Data representation</b></button>
          <div class="lesson-topic-nav-pages"><button class="active"><span>01</span><b>Number systems</b></button><button><span>02</span><b>Binary</b></button></div>
        </section>
      </aside>
      <footer class="lesson-nav lesson-topic-nav"><button>Previous</button><div><button class="active"></button><button></button></div><button>Next</button></footer>
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

  it.each([1, 7, 13])('opens chapter %i and lets the legacy observer settle', async (chapter) => {
    mountStudio(chapter);
    await install();
    await settle();

    const audit=bookCompletenessAudit(chapter)!;
    expect(audit.complete).toBe(true);
    const badge=document.querySelector<HTMLElement>('.lesson-source-complete-badge');
    expect(badge?.textContent).toBe(`${audit.checksCovered}/${audit.checksExpected} book completeness checks`);
    expect(badge?.dataset.complete).toBe('true');
    expect(badge?.title).toContain('Source Complete:');
    expect(document.querySelector('.lesson-v3-nav-label')?.textContent).toBe('1 / 3 · Introduction');
    expect(document.querySelectorAll('.lesson-v3-nav-center')).toHaveLength(1);

    document.body.append(document.createElement('aside'));
    await settle();
    expect(document.querySelectorAll('.lesson-source-complete-badge')).toHaveLength(1);
    expect(document.querySelectorAll('.lesson-v3-nav-center')).toHaveLength(1);
  });

  it('does not replace semantic topic/page navigation with the legacy slide scrubber',async()=>{
    mountTopicStudio(1);
    await install();
    await settle();
    expect(document.querySelectorAll('.lesson-v3-nav-center')).toHaveLength(0);
    expect(document.querySelectorAll('.lesson-topic-nav > div > button')).toHaveLength(2);
    expect(document.querySelector<HTMLButtonElement>('.lesson-topic-nav-topic')?.title).toContain('Open topic: Data representation');
    expect(document.querySelectorAll<HTMLButtonElement>('.lesson-topic-nav-pages > button')[0]?.title).toContain('Open page 1: Number systems');
  });

  it('updates legacy slide navigation and remains responsive after a slider jump', async () => {
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
