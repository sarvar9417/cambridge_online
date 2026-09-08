import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('Lesson slide scroll controller', () => {
  it('is installed by the Lesson Studio wrapper with the matching export name', () => {
    const wrapper = source('LessonStudio.tsx');
    const controller = source('lesson-studio-scroll-controller.ts');
    expect(controller).toContain('export function installLessonSlideScrollController()');
    expect(wrapper).toContain("import { installLessonSlideScrollController } from './lesson-studio-scroll-controller';");
    expect(wrapper).toContain('const releaseSlideScroll = installLessonSlideScrollController();');
    expect(wrapper).toContain('releaseSlideScroll();');
  });

  it('resets the lesson canvas to the top whenever the active learning screen changes', () => {
    const controller = source('lesson-studio-scroll-controller.ts');
    expect(controller).toContain(".lesson-nav > div button.active");
    expect(controller).toContain("active?.getAttribute('aria-label')");
    expect(controller).toContain("slide.scrollTo({ top: 0, left: 0, behavior: 'auto' });");
    expect(controller).toContain("attributeFilter: ['class']");
  });

  it('rebinds when library or chapter-hub navigation mounts the studio later', () => {
    const controller = source('lesson-studio-scroll-controller.ts');
    expect(controller).toContain('const mountObserver = new MutationObserver(bindStudio);');
    expect(controller).toContain("mountObserver.observe(document.body, { childList: true, subtree: true });");
    expect(controller).toContain('if (nextStudio === currentStudio)');
    expect(controller).toContain('syncActiveSlide();');
    expect(controller).toContain('mountObserver.disconnect();');
  });

  it('uses PageDown, PageUp and Space to scroll long screens before changing slides', () => {
    const controller = source('lesson-studio-scroll-controller.ts');
    expect(controller).toContain("['PageDown', 'PageUp', ' ']");
    expect(controller).toContain('slide.scrollHeight - slide.clientHeight');
    expect(controller).toContain('event.stopImmediatePropagation();');
    expect(controller).toContain("slide.scrollBy({ top: goingDown ? distance : -distance, behavior: 'smooth' });");
  });
});
