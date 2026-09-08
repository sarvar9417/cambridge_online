import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(name:string)=>readFileSync(resolve(process.cwd(),`src/teaching/${name}`),'utf8');

describe('Darslar Past Paper plain display contract',()=>{
  it('loads the plain and complete-source overrides after classroom presentation layers',()=>{
    const wrapper=source('LessonStudio.tsx');
    const classroom=wrapper.indexOf("import './lesson-classroom-semantic-source-only.css';");
    const plain=wrapper.indexOf("import './lesson-past-paper-plain.css';");
    const inline=wrapper.indexOf("import './lesson-past-paper-inline-source.css';");
    expect(classroom).toBeGreaterThan(-1);
    expect(plain).toBeGreaterThan(classroom);
    expect(inline).toBeGreaterThan(plain);
    expect(wrapper).toContain('installLessonPastPaperInlineSource()');
  });

  it('removes non-question chrome from topic Past Paper pages',()=>{
    const css=source('lesson-past-paper-plain.css');
    for(const selector of [
      '.lesson-checkpoint-contract',
      '.lesson-practice-cycle',
      '.lesson-exam-years',
      '.lesson-exam-summary',
      '.lesson-exam-year-header',
      '.lesson-exam-card > footer',
      '.lesson-exam-number',
      '.lesson-question-card-actions',
    ]) expect(css).toContain(selector);
    expect(css).toContain('display: none !important;');
  });

  it('replaces compact previews with complete source context and source assets inline',()=>{
    const renderer=source('lesson-past-paper-inline-source.ts');
    expect(renderer).toContain('/lesson-checkpoints?');
    expect(renderer).toContain('question.dependencies.forEach');
    expect(renderer).toContain('question.contextBlocks.forEach');
    expect(renderer).toContain("figure.className='qb-asset lesson-past-paper-inline-asset'");
    expect(renderer).toContain('if(question.hasDiagram&&!allAssets.some(asset=>isVisualAsset(asset)&&assetComplete(asset)))return false;');
    expect(renderer).toContain('if(question.hasDependency&&!question.dependencies.length)return false;');
    expect(renderer).toContain("source.className='lesson-past-paper-source'");
    expect(renderer).toContain("card.querySelector(':scope > .lesson-question-context')?.remove();");
  });

  it('uses both current checkpoint labels and historical matched LO codes when resolving the full source question',()=>{
    const renderer=source('lesson-past-paper-inline-source.ts');
    expect(renderer).toContain('function contractLoCodes(card:HTMLElement)');
    expect(renderer).toContain("querySelector('.lesson-checkpoint-contract strong')");
    expect(renderer).toContain('const loCodes=[...new Set([...contractLoCodes(card),...cardCodes])];');
  });

  it('suppresses compact or incomplete previews until the full source question is verified',()=>{
    const renderer=source('lesson-past-paper-inline-source.ts');
    const css=source('lesson-past-paper-inline-source.css');
    expect(renderer).toContain("card.dataset.pastPaperSourceReady='false';");
    expect(renderer).toContain("card.dataset.pastPaperSourceReady='true';");
    expect(css).toContain('.lesson-exam-card:not([data-past-paper-source-ready="true"])');
    expect(css).toContain('.lesson-past-paper-source-incomplete');
    expect(css).toContain('display: none !important;');
  });

  it('keeps only a simple reference/marks/question reading surface',()=>{
    const css=source('lesson-past-paper-plain.css');
    const inlineCss=source('lesson-past-paper-inline-source.css');
    expect(css).toContain('.lesson-exam-meta');
    expect(css).toContain('border-radius: 0 !important;');
    expect(css).toContain('box-shadow: none !important;');
    expect(inlineCss).toContain('.lesson-past-paper-context');
    expect(inlineCss).toContain('.lesson-past-paper-stem');
    expect(inlineCss).toContain('.lesson-past-paper-inline-asset > strong');
    expect(inlineCss).toContain('display: none !important;');
  });

  it('never clips or line-clamps Past Paper context, stem or visuals',()=>{
    const css=source('lesson-past-paper-plain.css');
    const inlineCss=source('lesson-past-paper-inline-source.css');
    expect(css).toContain('max-height: none !important;');
    expect(css).toContain('overflow: visible !important;');
    expect(css).toContain('-webkit-line-clamp: unset !important;');
    expect(css).toContain('line-clamp: unset !important;');
    expect(css).toContain('mask-image: none !important;');
    expect(inlineCss).toContain('max-height: none !important;');
    expect(inlineCss).toContain('overflow: visible !important;');
  });
});
