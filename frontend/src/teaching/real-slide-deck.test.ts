import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHAPTER_3_REAL_PPTX_DRIVE_URL,
  CHAPTER_3_REAL_SLIDE_COUNT,
  realSlideDeckFor,
} from './real-slide-decks';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Chapter 3 real PPTX presentation route',()=>{
  it('uses the 22-slide real Hardware deck instead of reconstructing Chapter 3 in HTML/CSS',()=>{
    expect(CHAPTER_3_REAL_SLIDE_COUNT).toBe(22);
    const components=realSlideDeckFor('9618',3,'3.1');
    const logic=realSlideDeckFor('9618',3,'3.2');
    expect(components?.slides).toHaveLength(22);
    expect(logic?.slides).toHaveLength(22);
    expect(components?.embedUrl).toContain('/file/d/1hvWdQBlwXbwTJcX0TaofL39ogTxWbCoM/preview');
    expect(CHAPTER_3_REAL_PPTX_DRIVE_URL).toContain('1hvWdQBlwXbwTJcX0TaofL39ogTxWbCoM');
    expect(realSlideDeckFor('9618',4,'4.1')).toBeNull();
  });

  it('routes LessonExperience Presentation mode through the real deck viewer only for configured decks',()=>{
    const experience=source('src/teaching/LessonExperience.tsx');
    expect(experience).toContain("import { RealSlideDeckPresentation } from './RealSlideDeckPresentation';");
    expect(experience).toContain('realSlideDeckFor(courseCode(chapter),chapter.number,activeTopic.code)');
    expect(experience).toContain('if(realDeck)return');
    expect(experience).toContain('<RealSlideDeckPresentation');
  });

  it('keeps a checked-in project manifest pointing at the shared Drive PPTX',()=>{
    const manifest=JSON.parse(source('public/9618/presentations/chapter-03/manifest.json'));
    expect(manifest.delivery).toBe('drive-embedded-pptx');
    expect(manifest.slideCount).toBe(22);
    expect(manifest.sourcePptx.shared).toBe(true);
    expect(manifest.runtime.htmlCssReconstruction).toBe(false);
    expect(manifest.runtime.sourceOfTruth).toBe('Drive PPTX');
  });
});
