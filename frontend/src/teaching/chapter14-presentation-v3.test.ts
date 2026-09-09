import { describe, expect, it } from 'vitest';
import {
  CHAPTER_14_PRESENTATION_SCENE_COUNT,
  chapter14PresentationStoryboard,
} from './chapter14-presentation-storyboard';

const ids=(topic:string)=>chapter14PresentationStoryboard(topic)?.map(scene=>scene.id)??[];

describe('Chapter 14 presentation v3 storyboard',()=>{
  it('splits source-rich Chapter 14 into projector-sized teaching moves',()=>{
    const all=ids('overview');
    expect(CHAPTER_14_PRESENTATION_SCENE_COUNT).toBe(42);
    expect(all).toHaveLength(42);
    expect(new Set(all).size).toBe(all.length);
  });

  it('separates protocol details instead of stacking them below overview visuals',()=>{
    const protocol=ids('14.1');
    for(const id of [
      'h14p-141-protocol-map',
      'h14p-141-ftp-detail',
      'h14p-141-email',
      'h14p-141-email-mechanics',
      'h14p-141-transport-family',
      'h14p-141-tcp',
      'h14p-141-ethernet',
      'h14p-141-ethernet-detail',
      'h14p-141-bittorrent',
      'h14p-141-bittorrent-terms',
    ]) expect(protocol).toContain(id);

    expect(protocol.indexOf('h14p-141-protocol-map')).toBeLessThan(protocol.indexOf('h14p-141-ftp-detail'));
    expect(protocol.indexOf('h14p-141-email')).toBeLessThan(protocol.indexOf('h14p-141-email-mechanics'));
    expect(protocol.indexOf('h14p-141-transport-family')).toBeLessThan(protocol.indexOf('h14p-141-tcp'));
    expect(protocol.indexOf('h14p-141-ethernet')).toBeLessThan(protocol.indexOf('h14p-141-ethernet-detail'));
    expect(protocol.indexOf('h14p-141-bittorrent')).toBeLessThan(protocol.indexOf('h14p-141-bittorrent-terms'));
  });

  it('separates switching comparison, examples and routing details into their own scenes',()=>{
    const switching=ids('14.2');
    for(const id of [
      'h14p-142-compare',
      'h14p-142-circuit-pros-cons',
      'h14p-142-packet-pros-cons',
      'h14p-142-video-example',
      'h14p-142-hop',
      'h14p-142-packet-control',
      'h14p-142-header',
      'h14p-142-header-extended',
      'h14p-142-routing',
      'h14p-142-routing-fields',
      'h14p-142-activity14a',
      'h14p-142-practice',
    ]) expect(switching).toContain(id);

    expect(switching.indexOf('h14p-142-compare')).toBeLessThan(switching.indexOf('h14p-142-circuit-pros-cons'));
    expect(switching.indexOf('h14p-142-circuit-pros-cons')).toBeLessThan(switching.indexOf('h14p-142-packet-pros-cons'));
    expect(switching.indexOf('h14p-142-packet-pros-cons')).toBeLessThan(switching.indexOf('h14p-142-video-example'));
    expect(switching.indexOf('h14p-142-hop')).toBeLessThan(switching.indexOf('h14p-142-packet-control'));
    expect(switching.indexOf('h14p-142-header')).toBeLessThan(switching.indexOf('h14p-142-header-extended'));
    expect(switching.indexOf('h14p-142-routing')).toBeLessThan(switching.indexOf('h14p-142-routing-fields'));
    expect(switching.indexOf('h14p-142-activity14a')).toBeLessThan(switching.indexOf('h14p-142-practice'));
  });

  it('keeps projector metadata source-backed but hidden from the learner-facing canvas',()=>{
    const scenes=chapter14PresentationStoryboard('overview')??[];
    expect(scenes.every(scene=>scene.sourcePages.length>0)).toBe(true);
    expect(scenes.every(scene=>scene.showSource===false)).toBe(true);
    expect(scenes.every(scene=>Boolean(scene.sceneRole))).toBe(true);
  });
});
