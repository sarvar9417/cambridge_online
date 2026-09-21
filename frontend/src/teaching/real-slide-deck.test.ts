import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHAPTER_3_PROJECT_PPTX_URL,
  CHAPTER_3_REAL_PPTX_DRIVE_URL,
  CHAPTER_3_REAL_SLIDE_COUNT,
  realSlideDeckFor,
} from './real-slide-decks';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const publicPath=(path:string)=>resolve(process.cwd(),'public',path.replace(/^\//,''));

describe('Chapter 3 real PPTX presentation route',()=>{
  it('uses the 22-slide real Hardware deck instead of reconstructing Chapter 3 in HTML/CSS',()=>{
    expect(CHAPTER_3_REAL_SLIDE_COUNT).toBe(22);
    const components=realSlideDeckFor('9618',3,'3.1');
    const logic=realSlideDeckFor('9618',3,'3.2');
    expect(components?.slides).toHaveLength(22);
    expect(logic?.slides).toHaveLength(22);
    expect(components?.slides[0]?.imageUrl).toContain('/chapter-03/slides/slide-01.jpg');
    expect(components?.slides[21]?.imageUrl).toContain('/chapter-03/slides/slide-22.jpg');
    expect(CHAPTER_3_REAL_PPTX_DRIVE_URL).toContain('1hvWdQBlwXbwTJcX0TaofL39ogTxWbCoM');
    expect(CHAPTER_3_PROJECT_PPTX_URL).toContain('Project_Mirror.pptx');
    expect(realSlideDeckFor('9618',4,'4.1')).toBeNull();
  });

  it('stores the real deck in Drive and a compressed real mirror plus all slide assets in the project',()=>{
    const deck=realSlideDeckFor('9618',3,'3.1')!;
    expect(existsSync(publicPath(deck.projectPptxUrl))).toBe(true);
    expect(statSync(publicPath(deck.projectPptxUrl)).size).toBeGreaterThan(1_000_000);
    for(const slide of deck.slides){
      const path=publicPath(slide.imageUrl);
      expect(existsSync(path),slide.imageUrl).toBe(true);
      expect(statSync(path).size,slide.imageUrl).toBeGreaterThan(40_000);
    }
  });

  it('routes LessonExperience Presentation mode through the real deck viewer only for configured decks',()=>{
    const experience=source('src/teaching/LessonExperience.tsx');
    const viewer=source('src/teaching/RealSlideDeckPresentation.tsx');
    expect(experience).toContain("import { RealSlideDeckPresentation } from './RealSlideDeckPresentation';");
    expect(experience).toContain('realSlideDeckFor(courseCode(chapter),chapter.number,activeTopic.code)');
    expect(experience).toContain('if(realDeck)return');
    expect(viewer).toContain('<img src={slide.imageUrl}');
    expect(viewer).not.toContain('<iframe');
    expect(viewer).toContain('projectPptxUrl');
    expect(viewer).toContain('pptxDriveUrl');
  });

  it('keeps a checked-in manifest that records both Drive and project storage',()=>{
    const manifest=JSON.parse(source('public/9618/presentations/chapter-03/manifest.json'));
    expect(manifest.delivery).toBe('project-slide-images');
    expect(manifest.slideCount).toBe(22);
    expect(manifest.slides).toHaveLength(22);
    expect(manifest.sourcePptx.shared).toBe(true);
    expect(manifest.projectMirror.pptx).toContain('Project_Mirror.pptx');
    expect(manifest.runtime.htmlCssReconstruction).toBe(false);
    expect(manifest.runtime.sourceOfTruth).toBe('Drive PPTX');
  });
});
