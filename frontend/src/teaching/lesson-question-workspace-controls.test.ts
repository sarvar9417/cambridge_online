// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

function workspace(id: string) {
  const shell = document.createElement('section');
  shell.id = id;
  shell.className = 'lesson-workspace-shell';
  shell.innerHTML = `
    <div class="lesson-workspace-toolbar"></div>
    <aside class="lesson-workspace-side-column">
      <button class="lesson-workspace-reveal">Reveal</button>
      <section class="lesson-workspace-scheme"><ol class="lesson-workspace-mark-points"><li>Point</li></ol></section>
    </aside>
    <nav class="lesson-workspace-navigation">
      <button class="lesson-workspace-nav">Previous</button>
      <button class="lesson-workspace-nav">Next</button>
    </nav>`;
  return shell;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Lesson Studio workspace controls lifecycle', () => {
  it('does not auto-install and releases its global observer', async () => {
    vi.resetModules();
    const disconnect = vi.fn();
    vi.stubGlobal('MutationObserver', class {
      observe() {}
      disconnect() { disconnect(); }
      takeRecords() { return []; }
    });

    document.body.append(workspace('first'));
    const controls = await import('./lesson-question-workspace-controls');
    expect(document.querySelectorAll('.lesson-workspace-audience-controls')).toHaveLength(0);

    const release = controls.installLessonQuestionWorkspaceControls();
    expect(document.querySelectorAll('.lesson-workspace-audience-controls')).toHaveLength(1);
    expect(document.querySelector('#first')?.getAttribute('data-audience')).toBe('student');

    release();
    expect(disconnect).toHaveBeenCalledOnce();

    document.body.append(workspace('second'));
    expect(document.querySelector('#second .lesson-workspace-audience-controls')).toBeNull();

    const releaseAgain = controls.installLessonQuestionWorkspaceControls();
    expect(document.querySelector('#second .lesson-workspace-audience-controls')).not.toBeNull();
    releaseAgain();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
