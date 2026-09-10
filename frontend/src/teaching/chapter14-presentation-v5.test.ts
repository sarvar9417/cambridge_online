import { describe, expect, it } from 'vitest';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';
import { hasChapter14PresentationVisualV4 } from './Chapter14PresentationVisualsV4';
import { hasChapter14PresentationVisualV5 } from './Chapter14PresentationVisualsV5';

describe('Chapter 14 visual-first pass 2',()=>{
  const storyboard=chapter14PresentationStoryboard('overview')??[];
  const byId=(id:string)=>storyboard.find(beat=>beat.id===id)!;

  it('upgrades the second flagship set to dedicated visual renderers',()=>{
    for(const id of [
      'h14p-141-ethernet','h14p-141-ethernet-detail','h14p-141-bittorrent','h14p-141-bittorrent-terms',
      'h14p-142-video-example','h14p-142-packet-control','h14p-142-header','h14p-142-header-extended',
      'h14p-142-routing','h14p-142-routing-fields',
    ]){
      expect(byId(id),`Missing storyboard scene ${id}`).toBeTruthy();
      expect(hasChapter14PresentationVisualV5(byId(id)),`Missing V5 renderer ${id}`).toBe(true);
      expect(hasChapter14PresentationVisualV4(byId(id)),`Flagship router does not expose ${id}`).toBe(true);
    }
  });

  it('keeps the visual-first renderers source-linked',()=>{
    expect(byId('h14p-141-ethernet').sourcePages).toEqual(expect.arrayContaining([334,335]));
    expect(byId('h14p-141-bittorrent').sourcePages).toEqual(expect.arrayContaining([335,336,337]));
    expect(byId('h14p-142-video-example').sourcePages).toContain(342);
    expect(byId('h14p-142-packet-control').sourcePages).toContain(340);
    expect(byId('h14p-142-header').sourcePages).toContain(341);
    expect(byId('h14p-142-routing').sourcePages).toEqual(expect.arrayContaining([341,342]));
  });
});
