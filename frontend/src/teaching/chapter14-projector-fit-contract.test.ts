import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const projectorCss=readFileSync(new URL('./chapter14-presentation-master-projector.css', import.meta.url),'utf8');
const heroFiles=[
  './Chapter14ApplicationHeroes.tsx',
  './Chapter14BitTorrentHero.tsx',
  './Chapter14FlowHeroes.tsx',
  './Chapter14HeroVisuals.tsx',
  './Chapter14NetworkControlHeroes.tsx',
  './Chapter14PacketControlHero.tsx',
  './Chapter14RoutingTableHero.tsx',
  './Chapter14RoutingTransferHero.tsx',
  './Chapter14SwitchingCompareHero.tsx',
].map(path=>readFileSync(new URL(path, import.meta.url),'utf8')).join('\n');

describe('Chapter 14 classroom projector fit contract',()=>{
  it('keeps the presentation stage scroll-safe rather than clipping overflowing content',()=>{
    expect(projectorCss).toContain('.lesson-experience.lx-present .lx-present-stage{min-height:0;overflow:auto');
    expect(projectorCss).not.toContain('.lesson-experience.lx-present .lx-present-stage{min-height:0;overflow:hidden');
  });

  it('keeps hero content fluid inside the projector stage',()=>{
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2{min-width:0;max-width:100%}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2 svg{display:block;max-width:100%;height:auto}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2 :is(main,section,aside,header,footer,div){min-width:0}');
  });

  it('protects projector microtext without replacing hierarchy',()=>{
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2 small{font-size:clamp(10.5px,.58vw,11.5px)!important;line-height:1.35}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2 code{font-size:clamp(10.5px,.58vw,11.5px)!important}');
  });

  it('has an explicit 1366px classroom width hardening rule',()=>{
    expect(projectorCss).toContain('@media (max-width:1366px)');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2{width:min(1120px,100%)}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .lx-present-screen{padding:20px 34px 18px}');
  });

  it('has an explicit 768px classroom height hardening rule',()=>{
    expect(projectorCss).toContain('@media (max-height:768px) and (min-width:1000px)');
    expect(projectorCss).toContain('.lesson-experience.lx-present .h14m-content-v2{min-height:0!important}');
    expect(projectorCss).toContain('.lesson-experience.lx-present .lx-present-screen{min-height:calc(100dvh - 116px);padding-top:16px;padding-bottom:14px}');
  });

  it('keeps the new hero roots bounded and avoids fixed page-width containers',()=>{
    const rootMinHeights=[...heroFiles.matchAll(/className="h14m-content-v2"[^>]*style=\{\{[^}]*minHeight:(\d+)/g)].map(match=>Number(match[1]));
    expect(rootMinHeights.length).toBeGreaterThan(10);
    expect(Math.max(...rootMinHeights)).toBeLessThanOrEqual(430);
    expect(heroFiles).not.toMatch(/className="h14m-content-v2"[^>]*style=\{\{[^}]*width:\s*['"]\d{4,}px/);
  });

  it('keeps long networking terms from forcing horizontal overflow',()=>{
    expect(projectorCss).toContain(':is(p,small,span,strong,b,code){overflow-wrap:break-word}');
    expect(heroFiles).toContain('SYNCHRONISE');
    expect(heroFiles).toContain('next-router MAC');
  });
});
