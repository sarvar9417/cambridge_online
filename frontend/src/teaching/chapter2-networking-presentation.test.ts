import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';
import { CHAPTER_2_NETWORKING_LESSON_COUNT } from './chapter2-networking-presentation';
import { hasChapter2DeviceVisual } from './Chapter2DeviceVisuals';
import { hasChapter2PresentationVisual } from './Chapter2PresentationVisuals';
import { shouldRenderGenericVisual } from './LessonContent';
import { LESSON_EXPERIENCE_CHAPTERS,presentationBeatsForTopic } from './lesson-experience-model';
import { buildTopicPlan } from './lesson-topic-plan';

const chapter=LESSON_EXPERIENCE_CHAPTERS.find(item=>item.number===2)!;
const topic=buildTopicPlan(chapter.slides,chapter.subtopics).find(item=>item.code==='2.1')!;
const beats=presentationBeatsForTopic(topic);
const ids=beats.map(beat=>beat.id);

describe('Chapter 2.1 classroom presentation',()=>{
  it('organises Networking into four complete classroom lessons',()=>{
    expect(CHAPTER_2_NETWORKING_LESSON_COUNT).toBe(4);
    for(let lesson=1;lesson<=4;lesson+=1){
      for(const stage of ['cover','objectives','starter','recap'])expect(ids).toContain(`h2n-l${lesson}-${stage}`);
      expect(ids.indexOf(`h2n-l${lesson}-cover`)).toBeLessThan(ids.indexOf(`h2n-l${lesson}-objectives`));
      expect(ids.indexOf(`h2n-l${lesson}-objectives`)).toBeLessThan(ids.indexOf(`h2n-l${lesson}-starter`));
      expect(ids.indexOf(`h2n-l${lesson}-starter`)).toBeLessThan(ids.indexOf(`h2n-l${lesson}-recap`));
    }
    expect(ids.indexOf('h2n-l1-recap')).toBeLessThan(ids.indexOf('h2n-l2-cover'));
    expect(ids.indexOf('h2n-l2-recap')).toBeLessThan(ids.indexOf('h2n-l3-cover'));
    expect(ids.indexOf('h2n-l3-recap')).toBeLessThan(ids.indexOf('h2n-l4-cover'));
    expect(ids).not.toContain('h2n-reference-appendix');
    expect(ids.indexOf('h2n-l3-starter')).toBeLessThan(beats.findIndex(beat=>beat.slideId==='h2-216-wnic'));
    expect(beats.findIndex(beat=>beat.slideId==='h2-216-softmodem')).toBeLessThan(ids.indexOf('h2n-l3-recap'));
  });

  it('provides custom session and device visuals in the projector route',()=>{
    for(const beat of beats.filter(item=>item.id.startsWith('h2n-')))expect(hasChapter2PresentationVisual(beat),beat.id).toBe(true);
    for(const slideId of ['h2-217-repeaters','h2-217-hubs','h2-217-switches','h2-217-bridges','h2-217-routers','h2-217-gateways','h2-217-modems','h2-217-nic-wnic']){
      expect(beats.some(beat=>beat.slideId===slideId&&hasChapter2DeviceVisual(beat)),slideId).toBe(true);
    }
    const sessionCss=readFileSync(resolve(process.cwd(),'src','teaching','chapter2-presentation-visuals.css'),'utf8');
    expect(sessionCss).toContain('@keyframes h2pvPacketJourney');
    expect(sessionCss).toContain('prefers-reduced-motion');
  });

  it('keeps source detail inside the teaching flow instead of a technical appendix',()=>{
    expect(ids).not.toContain('h2n-reference-appendix');
    expect(beats.every(beat=>Boolean(beat.sceneRole))).toBe(true);
    expect(beats.every(beat=>beat.showSource===false)).toBe(true);
    const visible=JSON.stringify(beats);
    expect(visible).not.toContain('COURSEBOOK · EMPHASISED CONTENT');
    expect(visible).not.toContain('Important emphasised coursebook concepts');
  });

  it('contains no Uzbek learner-facing wording',()=>{
    const visible=JSON.stringify(beats.map(({teacherNote:_,...beat})=>beat));
    for(const word of ['Kitobdagi','Manba','Javob','Dars','Mundarija','Oldingi','Keyingi','QALIN AJRATILGAN','Oddiy izoh','ATAMA','O‘YLANG','MUSTAQIL MASHQ']){
      expect(visible,word).not.toContain(word);
    }
  });

  it('removes the redundant HUB SWITCH ROUTER placeholder throughout Chapter 2',()=>{
    expect(shouldRenderGenericVisual('networking','h2-21-infra')).toBe(false);
    expect(shouldRenderGenericVisual('networking','h2-219-buffering')).toBe(false);
    expect(shouldRenderGenericVisual('networking','h2n-l1-cover')).toBe(false);
    expect(shouldRenderGenericVisual('internet','h2-221-internet')).toBe(true);
    expect(shouldRenderGenericVisual('networking','another-chapter')).toBe(true);
  });
});
