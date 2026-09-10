import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('Lesson page scroll controller', () => {
  it('is installed by the Lesson Studio wrapper with the matching export name', () => {
    const wrapper = source('LessonStudio.tsx');
    const controller = source('lesson-studio-scroll-controller.ts');
    expect(controller).toContain('export function installLessonSlideScrollController()');
    expect(wrapper).toContain("import { installLessonSlideScrollController } from './lesson-studio-scroll-controller';");
    expect(wrapper).toContain('const releaseSlideScroll = installLessonSlideScrollController();');
    expect(wrapper).toContain('releaseSlideScroll();');
  });

  it('resets the reading canvas whenever the active topic page changes', () => {
    const controller = source('lesson-studio-scroll-controller.ts');
    expect(controller).toContain(".lesson-slide[data-page-id]");
    expect(controller).toContain('page?.dataset.pageId');
    expect(controller).toContain("slide.scrollTo({ top: 0, left: 0, behavior: 'auto' });");
    expect(controller).toContain("attributeFilter: ['class', 'data-page-id']");
  });

  it('rebinds when library navigation mounts the studio later', () => {
    const controller = source('lesson-studio-scroll-controller.ts');
    expect(controller).toContain('const mountObserver = new MutationObserver(bindStudio);');
    expect(controller).toContain("mountObserver.observe(document.body, { childList: true, subtree: true });");
    expect(controller).toContain('if (nextStudio === currentStudio)');
    expect(controller).toContain('syncActivePage();');
    expect(controller).toContain('mountObserver.disconnect();');
  });

  it('uses PageDown, PageUp and Space to scroll long pages before navigation is allowed through', () => {
    const controller = source('lesson-studio-scroll-controller.ts');
    expect(controller).toContain("['PageDown', 'PageUp', ' ']");
    expect(controller).toContain('slide.scrollHeight - slide.clientHeight');
    expect(controller).toContain('event.stopImmediatePropagation();');
    expect(controller).toContain("slide.scrollBy({ top: goingDown ? distance : -distance, behavior: 'smooth' });");
  });
});
