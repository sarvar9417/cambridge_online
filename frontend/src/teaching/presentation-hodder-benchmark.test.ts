import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(name:string)=>readFileSync(resolve(process.cwd(),`src/teaching/${name}`),'utf8');
const css=source('presentation-hodder-benchmark.css');
const experience=source('LessonExperience.tsx');

describe('9618 Hodder presentation benchmark skin',()=>{
  it('scopes the visual benchmark to the 9618 presentation surface',()=>{
    expect(experience).toContain("import './presentation-hodder-benchmark.css';");
    expect(experience).toContain('data-course={courseCode(chapter)}');
    expect(experience).toContain('data-chapter={chapter.number}');
    expect(css).toContain('.lesson-experience.lx-present[data-course="9618"]');
    expect(css).not.toContain('[data-course="0478"]');
  });

  it('keeps the Chapter 3 benchmark visual language without image-only slides',()=>{
    expect(css).toContain('--hodder-navy:#063b69');
    expect(css).toContain('--hodder-cyan:#08a9d6');
    expect(css).toContain('border-top:9px solid var(--hodder-navy)');
    expect(css).toContain('border-bottom:9px solid var(--hodder-navy)');
    expect(css).toContain('.lx-present-terms section:nth-child(4n+1)');
    expect(css).toContain('.lx-table-wrap caption');
  });

  it('does not trade source completeness for a fixed screenshot canvas',()=>{
    expect(css).not.toContain('aspect-ratio:16/9');
    expect(css).not.toContain('overflow:hidden!important');
    expect(css).toContain('@media (max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media (prefers-reduced-motion:reduce)');
  });
});
