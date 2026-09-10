import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chapter14PresentationStoryboard, CHAPTER_14_PRESENTATION_SCENE_COUNT } from './chapter14-presentation-storyboard';
import {
  CHAPTER_14_PRESENTATION_REVEAL_COUNTS,
  chapter14PresentationRevealCount,
  hasChapter14PresentationRuntime,
} from './chapter14-presentation-runtime';
import lessonContent from './LessonContent.tsx?raw';
import lessonExperience from './LessonExperience.tsx?raw';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import finalRenderer from './Chapter14PresentationContentFinal.tsx?raw';
import emailRenderer from './Chapter14EmailSourceComplete.tsx?raw';
import scrollController from './presentation-scroll-controller.ts?raw';

const emailCss=readFileSync(resolve(process.cwd(),'src','teaching','chapter14-email-source-complete.css'),'utf8');

describe('Chapter 14 pre-deploy runtime contract',()=>{
  const storyboard=chapter14PresentationStoryboard('overview')??[];

  it('has one runtime contract entry for every live storyboard scene',()=>{
    const sceneIds=storyboard.map(scene=>scene.id);
    const runtimeIds=Object.keys(CHAPTER_14_PRESENTATION_REVEAL_COUNTS);
    expect(CHAPTER_14_PRESENTATION_SCENE_COUNT).toBe(43);
    expect(sceneIds).toHaveLength(43);
    expect(new Set(sceneIds).size).toBe(43);
    expect(new Set(runtimeIds)).toEqual(new Set(sceneIds));
    for(const beat of storyboard){
      expect(hasChapter14PresentationRuntime(beat),beat.id).toBe(true);
      expect(chapter14PresentationRevealCount(beat),beat.id).toBeGreaterThanOrEqual(0);
      expect(beat.sourcePages.length,`${beat.id} has no source provenance`).toBeGreaterThan(0);
    }
  });

  it('makes the final routing-retrieval scene reachable through the live facade',()=>{
    expect(storyboard.at(-1)?.id).toBe('h14p-142-recap-routing');
    expect(CHAPTER_14_PRESENTATION_REVEAL_COUNTS['h14p-142-recap-routing']).toBe(6);
    expect(facade).toContain('hasChapter14PresentationRuntime(beat)');
    expect(facade).toContain('Chapter14PresentationContentFinal');
    expect(finalRenderer).toContain("if(beat.id==='h14p-142-recap-routing')return <FinalRoutingRetrieval");
  });

  it('uses visual reveal counts rather than generic storyboard lengths',()=>{
    expect(CHAPTER_14_PRESENTATION_REVEAL_COUNTS['h14p-141-email']).toBe(6);
    expect(CHAPTER_14_PRESENTATION_REVEAL_COUNTS['h14p-141-ethernet']).toBe(5);
    expect(CHAPTER_14_PRESENTATION_REVEAL_COUNTS['h14p-141-check']).toBe(6);
    expect(CHAPTER_14_PRESENTATION_REVEAL_COUNTS['h14p-142-packet-control']).toBe(2);
    expect(CHAPTER_14_PRESENTATION_REVEAL_COUNTS['h14p-142-header']).toBe(4);
    expect(CHAPTER_14_PRESENTATION_REVEAL_COUNTS['h14p-142-header-extended']).toBe(5);
    expect(CHAPTER_14_PRESENTATION_REVEAL_COUNTS['h14p-142-practice']).toBe(4);
    expect(lessonContent).toContain('chapter14PresentationRevealCount(beat)');
    expect(lessonContent).toContain('if(chapter14Count!==null)return chapter14Count');
  });

  it('reconstructs Figures 14.3 and 14.4 without splitting protocols into false network nodes',()=>{
    expect(facade).toContain("beat.id==='h14p-141-email'");
    expect(facade).toContain('Chapter14EmailSourceComplete');
    for(const marker of [
      'FIGURES 14.3 + 14.4','SMTP','send email','EMAIL SERVER','POP / IMAP','receive email',
      "CLIENT'S ISP EMAIL SERVER",'uses SMTP/MIME protocol','INTERNET',"RECIPIENT'S DOMAIN EMAIL SERVER",'uses POP/IMAP protocol','RECIPIENT',
      'text-based, connection-based and a push protocol','media/binary attachments','pull protocols','does not keep server and client synchronised','keeps them synchronised',
    ])expect(emailRenderer).toContain(marker);
    expect(emailCss).toContain('opacity:.42');
    expect(emailCss).toContain('.h14email-source>main');
    expect(emailCss).toContain('@media(max-height:768px)');
  });

  it('lets the Chapter 14 renderer own projector content without duplicate generic blocks',()=>{
    expect(lessonContent).toContain("const chapter14Owned=v4Visual&&beat.id.startsWith('h14p-')");
    for(const marker of [
      '!chapter14Owned&&beat.lead',
      '!chapter14Owned&&beat.formula',
      '!chapter14Owned&&beat.bullets',
      '!chapter14Owned&&beat.keyTerms',
      '!chapter14Owned&&beat.example',
      '!chapter14Owned&&beat.prompt',
      '!chapter14Owned&&beat.activity',
    ])expect(lessonContent).toContain(marker);
  });

  it('keeps deterministic scene navigation separate from overflow scroll safety',()=>{
    expect(lessonExperience).toContain('onClick={()=>openBeat(beatIndex-1)}');
    expect(lessonExperience).toContain('onClick={()=>openBeat(beatIndex+1)}');
    expect(lessonExperience).toContain("event.key==='ArrowRight'");
    expect(lessonExperience).toContain("event.key==='ArrowLeft'");
    expect(scrollController).not.toContain("event.key==='ArrowRight'");
    expect(scrollController).not.toContain("event.key==='ArrowLeft'");
    expect(scrollController).not.toContain('click');
    expect(scrollController).toContain("event.key!=='PageDown'&&event.key!=='PageUp'");
  });
});
