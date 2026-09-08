import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('Lesson Studio classroom display contract', () => {
  it('loads the classroom layer after all legacy topic/presentation overrides', () => {
    const wrapper = source('LessonStudio.tsx');
    const hardening = wrapper.indexOf("import './lesson-topic-pages-hardening.css';");
    const classroom = wrapper.indexOf("import './lesson-classroom-display.css';");
    expect(hardening).toBeGreaterThan(-1);
    expect(classroom).toBeGreaterThan(hardening);
    expect(wrapper).toContain('installLessonClassroomDisplay()');
  });

  it('uses large projector typography and removes teacher-only source transcripts', () => {
    const css = source('lesson-classroom-display.css');
    expect(css).toContain('font-size: clamp(40px, 4vw, 68px) !important;');
    expect(css).toContain('font-size: clamp(23px, 1.75vw, 31px) !important;');
    expect(css).toContain('.lesson-topic-studio:fullscreen .lesson-source-transcript');
    expect(css).toContain('display: none !important;');
    expect(css).toContain('.lesson-classroom-scroll-meter');
    expect(css).toContain('.lesson-classroom-scroll-cue');
  });

  it('scrolls through a long classroom page before PageDown/Space advance it', () => {
    const controller = source('lesson-classroom-display.ts');
    expect(controller).toContain("event.key === 'PageDown' || event.key === ' ' || event.key === 'ArrowDown'");
    expect(controller).toContain("if (atEnd) activateNav(studio, 'next');");
    expect(controller).toContain("page.scrollBy({ top: step");
    expect(controller).toContain("window.addEventListener('keydown', onKeyDown, true);");
  });

  it('keeps explicit left/right page navigation for the teacher', () => {
    const controller = source('lesson-classroom-display.ts');
    expect(controller).toContain("event.key === 'ArrowRight'");
    expect(controller).toContain("activateNav(studio, 'next')");
    expect(controller).toContain("event.key === 'ArrowLeft'");
    expect(controller).toContain("activateNav(studio, 'previous')");
  });
});
