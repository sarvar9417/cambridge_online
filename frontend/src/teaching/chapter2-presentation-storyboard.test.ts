import { describe, expect, it } from 'vitest';
import { CHAPTER_2_FINAL } from './lesson-content-chapter2-checkpoints';
import { chapter2PresentationStoryboard } from './chapter2-presentation-storyboard';
import { curateChapterPresentation } from './chapter-presentation-curation';
import type { LessonPresentationBeat } from './lesson-experience-model';

function deck(topicCode:'2.1'|'2.2') {
  return chapter2PresentationStoryboard(topicCode,CHAPTER_2_FINAL.slides) ?? [];
}

describe('Chapter 2 authored presentation storyboard',()=>{
  it('uses explicit Chapter 2 scenes instead of the temporary generic rebuild engine',()=>{
    const networking=deck('2.1');
    const internet=deck('2.2');

    expect(networking.length).toBeGreaterThan(45);
    expect(internet.length).toBeGreaterThan(25);
    for(const scene of [...networking,...internet]){
      expect(scene.id.startsWith('h2p-')).toBe(true);
      expect(scene.id.startsWith('c14r-')).toBe(false);
      expect(scene.showSource).toBe(false);
    }
  });

  it('restores the thin/thick-client source content that is explicit in Hodder pp.35–36',()=>{
    const scenes=deck('2.1');
    const definitions=scenes.find(scene=>scene.id==='h2p-212-thin-thick-definition');
    const hardware=scenes.find(scene=>scene.id==='h2p-212-thin-thick-hardware');
    const software=scenes.find(scene=>scene.id==='h2p-212-thin-thick-software');

    expect(definitions?.sourcePages).toEqual([35]);
    expect(definitions?.richBlock?.kind).toBe('comparison');
    if(definitions?.richBlock?.kind==='comparison'){
      expect(definitions.richBlock.rows[0]?.[0]).toContain('continuous access');
      expect(definitions.richBlock.rows[0]?.[1]).toContain('online or offline');
    }

    expect(hardware?.richBlock?.kind).toBe('table');
    if(hardware?.richBlock?.kind==='table'){
      expect(hardware.richBlock.table.rows).toHaveLength(2);
      expect(hardware.richBlock.table.rows[0]?.[0]).toBe('Thick');
      expect(hardware.richBlock.table.rows[1]?.[0]).toBe('Thin');
    }

    expect(software?.richBlock?.kind).toBe('comparison');
    if(software?.richBlock?.kind==='comparison')expect(software.richBlock.rows).toHaveLength(4);
  });

  it('splits dense source tables into projector-readable semantic scenes',()=>{
    const scenes=deck('2.1');
    const rowCount=(id:string)=>{
      const block=scenes.find(scene=>scene.id===id)?.richBlock;
      return block?.kind==='table'?block.table.rows.length:block?.kind==='comparison'?block.rows.length:0;
    };

    expect(rowCount('h2p-213-topologies-bus-star')).toBe(2);
    expect(rowCount('h2p-213-topologies-mesh-hybrid')).toBe(2);
    expect(rowCount('h2p-215-cloud-storage-a')).toBe(3);
    expect(rowCount('h2p-215-cloud-storage-b')).toBe(2);
    expect(rowCount('h2p-216-cables-a')).toBe(3);
    expect(rowCount('h2p-216-cables-b')).toBe(3);
    expect(rowCount('h2p-217-devices-a')).toBe(4);
    expect(rowCount('h2p-217-devices-b')).toBe(3);
    expect(rowCount('h2p-219-pros-cons-a')).toBe(3);
    expect(rowCount('h2p-219-pros-cons-b')).toBe(2);
  });

  it('preserves the source process chains, worked examples and delayed-answer checks',()=>{
    const networking=deck('2.1');
    const internet=deck('2.2');

    expect(networking.find(scene=>scene.id==='h2p-218-csma-process')?.richBlock?.kind).toBe('steps');
    expect(networking.find(scene=>scene.id==='h2p-218-csma-trace')?.activity?.reveal).toContain('random backoff');
    expect(networking.find(scene=>scene.id==='h2p-219-stream-path')?.richBlock?.kind).toBe('figure');
    expect(internet.find(scene=>scene.id==='h2p-225-dns-process')?.richBlock?.kind).toBe('steps');
    expect(internet.find(scene=>scene.id==='h2p-223-zero-compression-check')?.example?.lines.join(' ')).toContain('INVALID');
    expect(internet.find(scene=>scene.id==='h2p-22-exam')?.activity?.reveal).toContain('DNS');
  });

  it('uses source-only internet/WWW and IPv6 comparisons rather than generic additions',()=>{
    const scenes=deck('2.2');
    const comparison=scenes.find(scene=>scene.id==='h2p-221-internet-web-compare');
    const ipv6=scenes.find(scene=>scene.id==='h2p-223-ipv6-benefits');

    expect(comparison?.sourcePages).toEqual([54,55]);
    expect(comparison?.richBlock?.kind).toBe('comparison');
    if(comparison?.richBlock?.kind==='comparison'){
      expect(comparison.richBlock.rows.some(row=>row.join(' ').includes('1969'))).toBe(false);
      expect(comparison.richBlock.rows.some(row=>row.join(' ').includes('application layer'))).toBe(false);
    }
    expect(ipv6?.bullets).toEqual([
      'No need for NATs (network address translation).',
      'Removes risk of private IP address collisions.',
      'Has built-in authentication.',
      'Allows more efficient routing.',
    ]);
  });

  it('uses the full Chapter 14 scene grammar across the authored Chapter 2 route',()=>{
    const roles=new Set([...deck('2.1'),...deck('2.2')].map(scene=>scene.sceneRole));
    for(const role of ['hook','objective','concept','process','visual','compare','challenge','exam','recap']){
      expect(roles.has(role as NonNullable<LessonPresentationBeat['sceneRole']>),role).toBe(true);
    }
  });

  it('covers the essential Chapter 2 source route',()=>{
    const covered=new Set([...deck('2.1'),...deck('2.2')].map(scene=>scene.slideId));
    for(const slideId of [
      'h2-211-arpanet-lan-wan','h2-214-sizes','h2-21-infra','h2-212-client-server','h2-212-p2p',
      'h2-213-topologies','h2-215-cloud','h2-216-wired','h2-216-wireless','h2-217-devices','h2-218-ethernet',
      'h2-218-csma-cd','h2-219-bitstreaming','h2-221-internet','h2-221-web','h2-222-pstn','h2-222-voip',
      'h2-223-ipv4','h2-223-ipv6','h2-224-urls','h2-225-dns','h2-226-html','h2-226-javascript','h2-226-php',
    ])expect(covered.has(slideId),slideId).toBe(true);
  });

  it('routes the integration point to authored Chapter 2 scenes',()=>{
    const raw:LessonPresentationBeat[]=[{
      id:'h2-21-infra-concept-1',slideId:'h2-21-infra',kind:'concept',eyebrow:'SOURCE',title:'raw',sourcePages:[30],lead:'raw',
    }];
    const curated=curateChapterPresentation(raw,'2.1');
    expect(curated[0]?.id).toBe('h2p-21-hook');
    expect(curated.every(scene=>scene.id.startsWith('h2p-'))).toBe(true);
  });
});
