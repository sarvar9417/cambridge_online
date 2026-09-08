import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('classroom display three-lens review', () => {
  it('keeps teacher orientation while removing audit chrome from the projected surface', () => {
    const css = source('lesson-classroom-display.css');
    expect(css).toContain('.lesson-topic-studio:fullscreen .lesson-toolbar-title');
    expect(css).toContain('.lesson-topic-studio:fullscreen .lesson-page-source-trace');
    expect(css).toContain('display: none !important;');
  });

  it('gives student-facing semantic blocks distinct projection treatment', () => {
    const css = source('lesson-classroom-display.css');
    expect(css).toContain('.lesson-student-activity');
    expect(css).toContain('.lesson-example');
    expect(css).toContain('.lesson-terms');
    expect(css).toContain('.hodder-callout.tone-activity');
  });

  it('suppresses technical Past Paper metadata during projection', () => {
    const css = source('lesson-classroom-display.css');
    expect(css).toContain('.lesson-exam-technical');
    expect(css).toContain('.lesson-exam-years');
  });

  it('tracks a focused teaching fragment while retaining scroll-before-advance behavior', () => {
    const controller = source('lesson-classroom-display.ts');
    expect(controller).toContain('lesson-classroom-fragment-status');
    expect(controller).toContain('classroom-fragment-focus');
    expect(controller).toContain("if (atEnd) activateNav(studio, 'next');");
  });
});
