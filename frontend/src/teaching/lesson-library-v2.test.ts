import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (name: string) => readFileSync(resolve(process.cwd(), `src/teaching/${name}`), 'utf8');

describe('Lessons library v2 visual contract', () => {
  it('loads after the first lesson design refresh and before scroll repairs', () => {
    const wrapper = source('LessonStudio.tsx');
    const responsiveRefresh = wrapper.indexOf("import './lesson-studio-design-refresh-responsive.css';");
    const libraryV2 = wrapper.indexOf("import './lesson-library-v2.css';");
    const scrollFix = wrapper.indexOf("import './lesson-studio-scroll-fix.css';");

    expect(responsiveRefresh).toBeGreaterThan(-1);
    expect(libraryV2).toBeGreaterThan(responsiveRefresh);
    expect(scrollFix).toBeGreaterThan(libraryV2);
  });

  it('keeps the second pass scoped to the Darslar library', () => {
    const css = source('lesson-library-v2.css');

    expect(css).toContain('.lesson-library > header');
    expect(css).toContain('.lesson-library-grid');
    expect(css).toContain('.lesson-chapter-card');
    expect(css).toContain('@media (max-width: 1180px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).not.toMatch(/\.lesson-studio(?:\s|\{|\.|:)/);
  });

  it('renders subtopics as a readable contents list instead of tag pills', () => {
    const css = source('lesson-library-v2.css');

    expect(css).toMatch(/\.lesson-chapter-card > div\s*\{[\s\S]*?display:\s*grid;/);
    expect(css).toMatch(/\.lesson-chapter-card > div span\s*\{[\s\S]*?border-radius:\s*0;/);
    expect(css).toContain('.lesson-chapter-card > div span::before');
  });
});
