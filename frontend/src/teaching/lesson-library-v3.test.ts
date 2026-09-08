import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('Darslar library v3 design contract', () => {
  it('loads the editorial library pass after v2 and before lesson scroll fixes', () => {
    const wrapper = source('LessonStudio.tsx');
    const v2 = wrapper.indexOf("import './lesson-library-v2.css';");
    const v3 = wrapper.indexOf("import './lesson-library-v3.css';");
    const scrollFix = wrapper.indexOf("import './lesson-studio-scroll-fix.css';");

    expect(v2).toBeGreaterThan(-1);
    expect(v3).toBeGreaterThan(v2);
    expect(scrollFix).toBeGreaterThan(v3);
  });

  it('uses a full-width curriculum catalogue with responsive chapter rows', () => {
    const css = source('lesson-library-v3.css');

    expect(css).toMatch(/\.lesson-library-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(css).toMatch(/\.lesson-chapter-card\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*132px/);
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(css).toContain('@media (max-width: 1080px)');
    expect(css).toContain('@media (max-width: 700px)');
  });

  it('does not target lesson workspace or fullscreen Board mode', () => {
    const css = source('lesson-library-v3.css');

    expect(css).not.toContain('.lesson-workspace');
    expect(css).not.toContain('.lesson-slide');
    expect(css).not.toContain(':fullscreen');
    expect(css).not.toContain('.lesson-toolbar');
  });
});
