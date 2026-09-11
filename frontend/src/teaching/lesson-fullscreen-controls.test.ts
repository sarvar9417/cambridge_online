import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(file:string)=>readFileSync(resolve(process.cwd(),`src/teaching/${file}`),'utf8');
const analytics=()=>readFileSync(resolve(process.cwd(),'src/AnalyticsPanel.tsx'),'utf8');

describe('Lesson Experience fullscreen controls',()=>{
  it('installs the shared control only on the teacher lessons route',()=>{
    const entry=analytics();
    expect(entry).toContain("installLessonFullscreenControls");
    expect(entry).toContain("if(route.page!=='darslar')return;");
    expect(entry).toContain('return installLessonFullscreenControls();');
  });

  it('toggles the complete lesson experience and stays in sync with browser fullscreen state',()=>{
    const controller=source('lesson-fullscreen-controls.ts');
    expect(controller).toContain("const ROOT_SELECTOR='.lesson-experience'");
    expect(controller).toContain('await target.requestFullscreen();');
    expect(controller).toContain('await document.exitFullscreen();');
    expect(controller).toContain("document.addEventListener('fullscreenchange',onFullscreenChange)");
    expect(controller).toContain("active?'Exit full screen':'Full screen'");
  });

  it('keeps Presentation Escape focused on leaving fullscreen before leaving the lesson',()=>{
    const controller=source('lesson-fullscreen-controls.ts');
    expect(controller).toContain("event.key!=='Escape'");
    expect(controller).toContain('event.stopImmediatePropagation();');
    expect(controller).toContain("window.addEventListener('keydown',onKeyDown,true)");
  });

  it('does not create a mutation-observer feedback loop while lesson content changes',()=>{
    const controller=source('lesson-fullscreen-controls.ts');
    expect(controller).toContain('if(root?.isConnected&&button?.isConnected)return;');
    expect(controller).toContain("if(label&&label.textContent!==labelText)label.textContent=labelText;");
    expect(controller).toContain("if(icon&&icon.textContent!==iconText)icon.textContent=iconText;");
    expect(controller).not.toContain('const observer=new MutationObserver(ensureButton);');
  });

  it('provides fullscreen layout hardening for Study, Presentation and Past Papers',()=>{
    const css=source('lesson-fullscreen-controls.css');
    expect(css).toContain('.lesson-experience:fullscreen');
    expect(css).toContain('.lesson-experience.lx-reader:fullscreen');
    expect(css).toContain('.lesson-experience.lx-present .lesson-fullscreen-toggle');
    expect(css).toContain('.lesson-fullscreen-controls-enabled .lx-exam-topic-head>button');
  });
});
