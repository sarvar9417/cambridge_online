import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAPTER_17_FINAL } from './lesson-content-chapter17-final';
import { CHAPTER_17_SECURITY_VISUAL_IDS, hasChapter17SecurityVisual } from './Chapter17SecurityVisuals';
import type { LessonPresentationBeat } from './lesson-experience-model';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const visualSource=source('Chapter17SecurityVisuals.tsx');
const css=source('chapter17-security-visuals.css');
const facade=source('Chapter14PresentationVisualsV4.tsx');
const beat=(slideId:string):LessonPresentationBeat=>({id:`${slideId}-concept-1`,slideId,kind:'concept',eyebrow:'TEST',title:'Test',sourcePages:[]});

describe('Cambridge 9618 Chapter 17 security classroom visuals',()=>{
  it('targets real source-backed Chapter 17 slides',()=>{
    const slideIds=new Set(CHAPTER_17_FINAL.slides.map(slide=>slide.id));
    expect(CHAPTER_17_SECURITY_VISUAL_IDS.length).toBeGreaterThanOrEqual(13);
    for(const id of CHAPTER_17_SECURITY_VISUAL_IDS)expect(slideIds.has(id)).toBe(true);
  });

  it('recognises Chapter 17 targets without leaking into adjacent chapters',()=>{
    expect(CHAPTER_17_SECURITY_VISUAL_IDS.every(id=>id.startsWith('h17-'))).toBe(true);
    expect(hasChapter17SecurityVisual(beat('h17-1741-signature-digest'))).toBe(true);
    expect(hasChapter17SecurityVisual(beat('h16-1634-rpn-stack'))).toBe(false);
    expect(hasChapter17SecurityVisual(beat('h18-overview'))).toBe(false);
  });

  it('covers encryption, QKD, TLS, signatures and certificate trust terminology',()=>{
    for(const term of [
      'CONFIDENTIALITY','AUTHENTICITY','INTEGRITY','NON-REPUDIATION','PLAINTEXT','CIPHERTEXT',
      'BLOCK CHAINING','SHARED SECRET KEY','KEY-DISTRIBUTION PROBLEM','PUBLIC KEY','PRIVATE KEY',
      'PHOTON','QUBIT','BB84 / QKD','SSL HANDSHAKE','HANDSHAKE PROTOCOL','RECORD PROTOCOL',
      'SESSION CACHING','CA / PKI CHECKS','DIGEST','DIGITAL SIGNATURE','CERTIFICATE AUTHORITY','SELF-SIGNED',
    ])expect(visualSource).toContain(term);
  });

  it('keeps Chapter 17 diagrams additive to the source-backed teaching payload',()=>{
    expect(facade).toContain("import { Chapter17SecurityVisual, hasChapter17SecurityVisual } from './Chapter17SecurityVisuals';");
    expect(facade).toContain('hasChapter17SecurityVisual(beat)');
    expect(facade).toContain('return <Chapter17SecurityVisual beat={beat} reveal={reveal}/>;');
    const ownsBody=facade.slice(facade.indexOf('export function presentationVisualOwnsBeatContent'),facade.indexOf('export function Chapter14PresentationVisualV4'));
    expect(ownsBody).not.toContain('hasChapter17SecurityVisual');
  });

  it('has projector fit and responsive rules without hiding content',()=>{
    expect(css).toContain('@media(max-width:1366px)');
    expect(css).toContain('@media(max-height:768px) and (min-width:960px)');
    expect(css).toContain('@media(max-width:900px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).not.toMatch(/display\s*:\s*none/);
  });
});
