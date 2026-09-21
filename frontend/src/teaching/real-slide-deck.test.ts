import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHAPTER_3_PROJECT_PPTX_URL,
  CHAPTER_3_REAL_PPTX_DRIVE_URL,
  CHAPTER_3_REAL_SLIDE_COUNT,
  REAL_SLIDE_IMAGE_FORMAT,
  REAL_SLIDE_IMAGE_HEIGHT,
  REAL_SLIDE_IMAGE_WIDTH,
  realSlideDeckFor,
} from './real-slide-decks';

const source=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const publicPath=(path:string)=>resolve(process.cwd(),'public',path.replace(/^\//,''));

function expectProjectDeck(course:string,chapter:number,topicCode:string,slideCount:number){
  const deck=realSlideDeckFor(course,chapter,topicCode);
  expect(deck).not.toBeNull();
  expect(deck?.slides).toHaveLength(slideCount);
  expect(deck?.slides[0]?.imageUrl).toContain(`/chapter-${String(chapter).padStart(2,'0')}/slides/slide-01.webp`);
  expect(deck?.slides.at(-1)?.imageUrl).toContain(`slide-${String(slideCount).padStart(2,'0')}.webp`);
  expect(existsSync(publicPath(deck!.projectPptxUrl))).toBe(true);
  expect(statSync(publicPath(deck!.projectPptxUrl)).size).toBeGreaterThan(1_000_000);
  for(const slide of deck!.slides){
    const path=publicPath(slide.imageUrl);
    expect(existsSync(path),slide.imageUrl).toBe(true);
    expect(statSync(path).size,slide.imageUrl).toBeGreaterThan(40_000);
  }
  return deck!;
}

describe('approved real PowerPoint lesson presentation route',()=>{
  it('uses high-resolution WebP slide assets for large displays',()=>{
    expect(REAL_SLIDE_IMAGE_WIDTH).toBe(2560);
    expect(REAL_SLIDE_IMAGE_HEIGHT).toBe(1440);
    expect(REAL_SLIDE_IMAGE_FORMAT).toBe('webp');
  });

  it('keeps only Chapter 3 as the approved real Hardware deck',()=>{
    expect(CHAPTER_3_REAL_SLIDE_COUNT).toBe(22);
    expectProjectDeck('9618',3,'3.1',22);
    expectProjectDeck('9618',3,'3.2',22);
    expect(CHAPTER_3_REAL_PPTX_DRIVE_URL).toContain('1hvWdQBlwXbwTJcX0TaofL39ogTxWbCoM');
    expect(CHAPTER_3_PROJECT_PPTX_URL).toContain('Project_Mirror.pptx');
    expect(realSlideDeckFor('9618',4,'4.1')).toBeNull();
    expect(realSlideDeckFor('9618',5,'5.1')).toBeNull();
    expect(realSlideDeckFor('9618',6,'6.1')).toBeNull();
  });

  it('renders configured decks with project-hosted high-resolution slide images rather than an iframe',()=>{
    const experience=source('src/teaching/LessonExperience.tsx');
    const viewer=source('src/teaching/RealSlideDeckPresentation.tsx');
    const css=source('src/teaching/real-slide-deck.css');
    expect(experience).toContain("import { RealSlideDeckPresentation } from './RealSlideDeckPresentation';");
    expect(experience).toContain('realSlideDeckFor(courseCode(chapter),chapter.number,activeTopic.code)');
    expect(experience).toContain('if(realDeck)return');
    expect(viewer).toContain('<img src={slide.imageUrl}');
    expect(viewer).toContain('width={2560}');
    expect(viewer).toContain('height={1440}');
    expect(viewer).not.toContain('<iframe');
    expect(viewer).toContain('HIGH-RES REAL DECK');
    expect(viewer).toContain('projectPptxUrl');
    expect(viewer).toContain('pptxDriveUrl');
    expect(css).toContain('image-rendering:auto');
  });

  it('records high-resolution Drive source and project storage only for approved Chapter 3',()=>{
    const manifest=JSON.parse(source('public/9618/presentations/chapter-03/manifest.json'));
    expect(manifest.delivery).toBe('project-slide-images');
    expect(manifest.slideFormat).toBe('webp');
    expect(manifest.imageWidth).toBe(2560);
    expect(manifest.imageHeight).toBe(1440);
    expect(manifest.sourcePptx.shared).toBe(true);
    expect(manifest.projectMirror.pptx).toContain('Project_Mirror.pptx');
    expect(manifest.runtime.htmlCssReconstruction).toBe(false);
    expect(manifest.runtime.sourceOfTruth).toBe('Drive PPTX');
    expect(manifest.runtime.projectDelivery).toContain('high-resolution');
    expect(manifest.slides).toHaveLength(22);
    for(const slide of manifest.slides)expect(slide.image).toMatch(/\.webp$/);
    expect(existsSync(publicPath('/9618/presentations/chapter-04/manifest.json'))).toBe(false);
    expect(existsSync(publicPath('/9618/presentations/chapter-05/manifest.json'))).toBe(false);
  });
});
