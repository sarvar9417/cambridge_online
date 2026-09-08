import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('Lesson Studio Board mode scroll contract', () => {
  it('loads the Board scroll override after the regular lesson scroll repair', () => {
    const wrapper = source('LessonStudio.tsx');
    const regularScroll = wrapper.indexOf("import './lesson-studio-scroll-fix.css';");
    const boardScroll = wrapper.indexOf("import './lesson-studio-board-scroll-fix.css';");

    expect(regularScroll).toBeGreaterThan(-1);
    expect(boardScroll).toBeGreaterThan(regularScroll);
  });

  it('overrides the projector overflow lock with a definite scrollable canvas', () => {
    const css = source('lesson-studio-board-scroll-fix.css');

    expect(css).toContain('height: min(calc(100vh - 116px), 54vw) !important;');
    expect(css).toContain('overflow-x: hidden !important;');
    expect(css).toContain('overflow-y: auto !important;');
    expect(css).toContain('overscroll-behavior: contain;');
    expect(css).toContain('-webkit-overflow-scrolling: touch;');
  });
});
