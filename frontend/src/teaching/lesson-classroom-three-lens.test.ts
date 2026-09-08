import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('classroom projection three-lens contract', () => {
  it('loads the teacher/student/designer refinement after the base classroom layer', () => {
    const wrapper = source('LessonStudio.tsx');
    const base = wrapper.indexOf("import './lesson-classroom-display.css';");
    const refinement = wrapper.indexOf("import './lesson-classroom-three-lens.css';");
    expect(base).toBeGreaterThan(-1);
    expect(refinement).toBeGreaterThan(base);
    expect(wrapper).toContain('installLessonClassroomFocus()');
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

  it('tracks the current semantic teaching fragment without dimming the rest of the page', () => {
    const focus = source('lesson-classroom-focus.ts');
    const css = source('lesson-classroom-three-lens.css');
    expect(focus).toContain('classroom-fragment-focus');
    expect(focus).toContain('Qism ${activeIndex + 1}/${fragments.length}');
    expect(css).toContain('.lesson-page-fragment.classroom-fragment-focus');
    expect(css).not.toContain('opacity: .35');
  });

  it('includes a short-height projector fallback for 1366x768-style classrooms', () => {
    const css = source('lesson-classroom-three-lens.css');
    expect(css).toContain('@media (max-height: 820px)');
    expect(css).toContain('--classroom-page-heading: clamp(34px, 3vw, 50px);');
  });
});
