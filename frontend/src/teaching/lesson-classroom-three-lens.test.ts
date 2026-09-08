import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('classroom projection three-lens contract', () => {
  it('loads the teacher/student/designer refinement and structural guard last', () => {
    const wrapper = source('LessonStudio.tsx');
    const base = wrapper.indexOf("import './lesson-classroom-display.css';");
    const refinement = wrapper.indexOf("import './lesson-classroom-three-lens.css';");
    const structure = wrapper.indexOf("import './lesson-classroom-three-lens-structure.css';");
    expect(base).toBeGreaterThan(-1);
    expect(refinement).toBeGreaterThan(base);
    expect(structure).toBeGreaterThan(refinement);
    expect(wrapper).toContain('installLessonClassroomFocus()');
  });

  it('keeps a readable left Topic/Page rail available on a classroom projector', () => {
    const structure = source('lesson-classroom-three-lens-structure.css');
    expect(structure).toContain('--classroom-rail: clamp(210px, 15vw, 280px);');
    expect(structure).toContain('grid-template-columns: var(--classroom-rail) minmax(0, 1fr) !important;');
    expect(structure).toContain('.lesson-studio.hodder-studio.lesson-topic-studio:fullscreen .lesson-outline.lesson-topic-outline');
    expect(structure).toContain('font-size: clamp(13px, .9vw, 16px) !important;');
    expect(structure).toContain('font-size: clamp(12px, .8vw, 14px) !important;');
    expect(structure).toContain('display: block !important;');
  });

  it('keeps the active Page visible in the rail and removes only an exact duplicate projected heading', () => {
    const focus = source('lesson-classroom-focus.ts');
    const structure = source('lesson-classroom-three-lens-structure.css');
    expect(focus).toContain("const activePage = studio.querySelector<HTMLElement>('.lesson-topic-nav-pages > button.active');");
    expect(focus).toContain('const active = activePage ?? activeTopic;');
    expect(focus).toContain("fragmentHeading.classList.toggle('classroom-redundant-heading', duplicate);");
    expect(structure).toContain('.classroom-redundant-heading');
    expect(structure).toContain('display: none !important;');
  });

  it('keeps projector navigation keys working after the teacher clicks the Topic/Page rail', () => {
    const controller = source('lesson-classroom-display.ts');
    expect(controller).toContain("const CLASSROOM_NAV_CONTROL = '.lesson-topic-outline button,.lesson-topic-nav > button';");
    expect(controller).toContain('if (interactive && !navControl) return;');
    expect(controller).toContain("if (navControl && (event.key === ' ' || event.key === 'Enter')) return;");
    expect(controller).toContain("event.key === 'PageDown'");
  });

  it('removes non-learning helper copy while keeping page identity', () => {
    const css = source('lesson-classroom-three-lens.css');
    expect(css).toContain('.lesson-topic-studio:fullscreen .lesson-topic-page-head > p');
    expect(css).toContain('display: none !important;');
    expect(css).toContain('.lesson-topic-studio:fullscreen .lesson-topic-page-head h1');
  });

  it('gives examples, activities, key terms and callouts distinct classroom grammar', () => {
    const css = source('lesson-classroom-three-lens.css');
    expect(css).toContain('.lesson-example');
    expect(css).toContain('.lesson-student-activity');
    expect(css).toContain('.lesson-terms > article');
    expect(css).toContain('.hodder-callout.tone-activity');
    expect(css).toContain('.hodder-callout.tone-extension');
  });

  it('keeps Past Paper question content while suppressing projected technical metadata', () => {
    const css = source('lesson-classroom-three-lens.css');
    expect(css).toContain('.lesson-exam-years');
    expect(css).toContain('.lesson-exam-summary');
    expect(css).toContain('.lesson-exam-technical');
    expect(css).toContain('display: none !important;');
    expect(css).toContain('.lesson-exam-card');
  });

  it('keeps Past Paper in the same vertical PageDown/Space teaching flow', () => {
    const structure = source('lesson-classroom-three-lens-structure.css');
    expect(structure).toContain('.lesson-studio.hodder-studio.lesson-topic-studio:fullscreen .lesson-exam-scroll');
    expect(structure).toContain('overflow: visible !important;');
    expect(structure).toContain('grid-template-columns: minmax(0, 1fr) !important;');
    expect(structure).toContain('scroll-snap-type: none !important;');
  });

  it('does not clamp source-required Past Paper wording or context on the projector', () => {
    const structure = source('lesson-classroom-three-lens-structure.css');
    expect(structure).toContain('.lesson-exam-card .lesson-question-context');
    expect(structure).toContain('.lesson-exam-card > .qtext-host');
    expect(structure).toContain('max-height: none !important;');
    expect(structure).toContain('-webkit-line-clamp: unset !important;');
    expect(structure).toContain('mask-image: none !important;');
  });

  it('tracks the current semantic teaching fragment without dimming or mutation-looping', () => {
    const focus = source('lesson-classroom-focus.ts');
    const css = source('lesson-classroom-three-lens.css');
    expect(focus).toContain('classroom-fragment-focus');
    expect(focus).toContain('Qism ${activeIndex + 1}/${fragments.length}');
    expect(focus).toContain('if (status.textContent !== label) status.textContent = label;');
    expect(css).toContain('.lesson-page-fragment.classroom-fragment-focus');
    expect(css).not.toContain('opacity: .35');
  });

  it('includes a short-height projector fallback for 1366x768-style classrooms', () => {
    const css = source('lesson-classroom-three-lens.css');
    expect(css).toContain('@media (max-height: 820px)');
    expect(css).toContain('--classroom-page-heading: clamp(34px, 3vw, 50px);');
  });
});
