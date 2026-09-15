import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source=(file:string)=>readFileSync(resolve(process.cwd(),'src/teaching',file),'utf8');
const projectorCss=source('chapter14-presentation-master-projector.css');
const heroFiles=[
  'Chapter14ApplicationHeroes.tsx',
  'Chapter14BitTorrentHero.tsx',
  'Chapter14FlowHeroes.tsx',
  'Chapter14HeroVisuals.tsx',
  'Chapter14NetworkControlHeroes.tsx',
  'Chapter14OrientationHero.tsx',
  'Chapter14PacketControlHero.tsx',
  'Chapter14RoutingTableHero.tsx',
  'Chapter14RoutingTransferHero.tsx',
  'Chapter14SwitchingCompareHero.tsx',
].map(source).join('\n');

describe('Chapter 14 classroom projector fit contract',()=>{
  it('keeps the stage and slide scroll-safe rather than clipping overflow',()=>{
    expect(projectorCss).toContain('.lesson-experience.lx-present .lx-present-stage{min-height:0;overflow:auto');
    expect(projectorCss).toContain('max-height:calc(100dvh - 124px);overflow:auto');
    expect(projectorCss).not.toContain('.lesson-experience.lx-present .lx-present-stage{min-height:0;overflow:hidden');
  });

  it('keeps hero content fluid inside the projector stage',()=>{
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2{min-width:0;max-width:100%;font-size:14px}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2 svg{display:block;max-width:100%;height:auto}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2 :is(main,section,aside,header,footer,div){min-width:0;max-width:100%}');
  });

  it('keeps microtext readable without forcing oversized global typography',()=>{
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2 small{font-size:clamp(11.5px,.68vw,13px)!important;line-height:1.34}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2 code{font-size:clamp(11.5px,.68vw,13px)!important}');
  });

  it('has an explicit 1366px classroom width fit rule',()=>{
    expect(projectorCss).toContain('@media (max-width:1366px)');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2{width:min(1120px,100%);font-size:13.5px}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .lx-present-screen{padding:16px 28px 14px;gap:10px}');
  });

  it('has an explicit 768px classroom height fit rule',()=>{
    expect(projectorCss).toContain('@media (max-height:768px) and (min-width:1000px)');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2{min-height:0!important;font-size:13px}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2>:is(section,main,aside){min-height:0!important}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2>footer{font-size:clamp(11.5px,.82vw,13px)!important;line-height:1.3}');
  });

  it('keeps the hero roots bounded and avoids fixed page-width containers',()=>{
    const rootMinHeights=[...heroFiles.matchAll(/className="h14m-content-v2"[^>]*style=\{\{[^}]*minHeight:(\d+)/g)].map(match=>Number(match[1]));
    expect(rootMinHeights.length).toBeGreaterThan(10);
    expect(Math.max(...rootMinHeights)).toBeLessThanOrEqual(430);
    expect(heroFiles).not.toMatch(/className="h14m-content-v2"[^>]*style=\{\{[^}]*width:\s*['"]\d{4,}px/);
  });

  it('keeps long networking terms from forcing horizontal overflow',()=>{
    expect(projectorCss).toContain(':is(p,small,span,strong,b,code){overflow-wrap:break-word;word-break:normal}');
    expect(heroFiles).toContain('SYNCHRONISE');
    expect(heroFiles).toContain('next-router MAC');
  });
});
