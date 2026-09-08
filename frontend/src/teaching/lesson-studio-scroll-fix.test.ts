import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('Lesson Studio long-content scroll contract', () => {
  it('loads the scroll repair after the design refresh styles', () => {
    const wrapper = source('LessonStudio.tsx');
    const refresh = wrapper.indexOf("import './lesson-studio-design-refresh-responsive.css';");
    const scrollFix = wrapper.indexOf("import './lesson-studio-scroll-fix.css';");

    expect(refresh).toBeGreaterThan(-1);
    expect(scrollFix).toBeGreaterThan(refresh);
  });

  it('keeps the workspace shrinkable and the lesson canvas vertically scrollable', () => {
    const css = source('lesson-studio-scroll-fix.css');

    expect(css).toMatch(/\.lesson-workspace\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;/);
    expect(css).toMatch(/\.lesson-slide\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/);
    expect(css).toContain('overscroll-behavior: contain;');
    expect(css).toContain('-webkit-overflow-scrolling: touch;');
  });
});
