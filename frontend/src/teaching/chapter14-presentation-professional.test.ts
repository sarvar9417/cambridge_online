import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css=readFileSync(resolve(process.cwd(),'src','teaching','chapter14-presentation-professional.css'),'utf8');
const main=readFileSync(resolve(process.cwd(),'src','main.tsx'),'utf8');

describe('Chapter 14 professional projector design',()=>{
  it('loads the professional layer after legacy presentation styles',()=>{
    const professional=main.indexOf("./teaching/chapter14-presentation-professional.css");
    const legacy=main.indexOf("./teaching/chapter14-presentation-v5-visuals.css");
    expect(professional).toBeGreaterThan(legacy);
  });

  it('uses a dedicated high-contrast projector palette and hides source audit ribbons',()=>{
    expect(css).toContain('--deck-bg:#06101d');
    expect(css).toContain('--deck-ink:#f7fbff');
    expect(css).toContain('--deck-muted:#b9c7d7');
    expect(css).toContain('.h14v6-source-ribbon{display:none!important}');
  });

  it('keeps navigation chrome compact and short-projector layouts responsive',()=>{
    expect(css).toContain('grid-template-rows:56px minmax(0,1fr) 58px');
    expect(css).toContain('@media(max-height:820px)');
    expect(css).toContain('overflow:auto');
  });

  it('provides deliberate layouts for the flagship visual scenes',()=>{
    for(const selector of [
      '.h14v6-stack',
      '.h14v6-http',
      '.h14v6-email',
      '.h14v6-torrent',
      '.h14v6-network',
      '.h14v6-proscons',
      '.h14v6-header',
      '.h14v6-routing',
      '.h14v6-exam',
      '.h14v6-recap',
    ]) expect(css).toContain(selector);
  });
});
