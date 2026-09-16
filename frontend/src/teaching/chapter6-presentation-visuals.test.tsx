import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LessonPresentationScreen } from './LessonContent';
import { CHAPTER_6_FINAL } from './lesson-content-chapter6-final';
import type { LessonPresentationBeat } from './lesson-experience-model';
import {
  CHAPTER_6_SECURITY_VISUAL_IDS,
  Chapter6SecurityVisual,
  hasChapter6SecurityVisual,
} from './Chapter6SecurityVisuals';
import { hasChapter14PresentationVisualV4, presentationVisualOwnsBeatContent } from './Chapter14PresentationVisualsV4';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter6SecurityVisuals.tsx');
const css=source('chapter6-security-visuals.css');

const beat=(slideId:string,overrides:Partial<LessonPresentationBeat>={}):LessonPresentationBeat=>({
  id:`${slideId}-ideas-1`,
  slideId,
  kind:'key-idea',
  eyebrow:'CHAPTER 6 · SOURCE-BACKED',
  title:'Chapter 6 projector scene',
  sourcePages:[160],
  bullets:['SOURCE-BACKED-SECURITY-EXPLANATION'],
  showSource:false,
  ...overrides,
});

describe('Chapter 6 classroom presentation visuals',()=>{
  it('registers source-backed visual targets that exist in the final chapter',()=>{
    expect(CHAPTER_6_SECURITY_VISUAL_IDS).toEqual([
      'h6-612-accounts-passwords',
      'h6-612-signatures-firewall',
      'h6-612-antimalware-encryption-biometrics',
      'h6-613-pharming',
      'h6-614-recovery',
      'h6-621-validation',
      'h6-622-modulo11-checksum',
      'h6-622-parity-block',
      'h6-622-arq',
    ]);
    const finalIds=new Set(CHAPTER_6_FINAL.slides.map(slide=>slide.id));
    for(const id of CHAPTER_6_SECURITY_VISUAL_IDS)expect(finalIds.has(id),id).toBe(true);
  });

  it('routes every target through the shared visual facade without replacing the source payload',()=>{
    for(const id of CHAPTER_6_SECURITY_VISUAL_IDS){
      const item=beat(id);
      expect(hasChapter6SecurityVisual(item),id).toBe(true);
      expect(hasChapter14PresentationVisualV4(item),id).toBe(true);
      expect(presentationVisualOwnsBeatContent(item),id).toBe(false);
    }
  });

  it('keeps the source explanation visible beside the firewall diagram',()=>{
    const html=renderToStaticMarkup(<LessonPresentationScreen beat={beat('h6-612-signatures-firewall')} reveal={2}/>);
    expect(html).toContain('h6sec-firewall');
    expect(html).toContain('FIREWALL');
    expect(html).toContain('ALLOW');
    expect(html).toContain('BLOCK');
    expect(html).toContain('LOG');
    expect(html).toContain('SOURCE-BACKED-SECURITY-EXPLANATION');
    expect(html).toContain('lx-present-screen--split-rich');
  });

  it('renders all registered diagrams without an empty facade result',()=>{
    for(const id of CHAPTER_6_SECURITY_VISUAL_IDS){
      const html=renderToStaticMarkup(<Chapter6SecurityVisual beat={beat(id)} reveal={3}/>);
      expect(html.length,id).toBeGreaterThan(80);
      expect(html,id).toContain('h6sec');
    }
  });

  it('uses Chapter 6 source terminology for security and integrity mechanisms',()=>{
    for(const term of [
      'USERNAME + PASSWORD','ACCESS LEVEL','FIREWALL','ANTIVIRUS','ANTI-SPYWARE','ENCRYPTION','BIOMETRICS',
      'DNS / LOCAL NAME DATA','ACCIDENTAL LOSS','VALID ≠ FACTUALLY CORRECT','CHECK DIGIT · MODULO-11',
      'CHECKSUM','PARITY BYTE / COLUMNS','POSITIVE ACKNOWLEDGEMENT','NO ACK BEFORE TIMEOUT',
    ])expect(visualSource,term).toContain(term);
  });

  it('keeps the diagrams projector-safe at 1366×768 and preserves upcoming states',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('max-height:430px');
    expect(css).toContain('.is-upcoming{opacity:.2');
    expect(css).not.toContain('visibility:hidden');
    expect(css).not.toContain('display:none!important');
  });
});
