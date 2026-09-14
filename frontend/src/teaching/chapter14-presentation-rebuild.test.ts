import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import rebuild from './Chapter14PresentationRebuild.tsx?raw';
import facade from './Chapter14PresentationVisualsV4.tsx?raw';
import runtime from './chapter14-presentation-runtime.ts?raw';

const css=readFileSync(resolve(process.cwd(),'src','teaching','chapter14-presentation-rebuild.css'),'utf8');

describe('Chapter 14 presentation rebuild',()=>{
  it('keeps the four TCP/IP layers and both communication directions visible on the projector',()=>{
    for(const term of ['APPLICATION','TRANSPORT','INTERNET','LINK','SENDING','RECEIVING']){
      expect(rebuild).toContain(term);
    }
    expect(rebuild).toContain('Application → Transport → Internet → Link');
    expect(rebuild).toContain('At the receiving host, the order is reversed');
  });

  it('teaches the same data through encapsulation and the receiver journey',()=>{
    for(const term of ['APPLICATION DATA','SEGMENT','DATAGRAM','FRAME','TCP HEADER','IP HEADER','LINK HEADER','FRAME CHECK']){
      expect(rebuild).toContain(term);
    }
    expect(rebuild).toContain('The message is not replaced at each layer');
    expect(rebuild).toContain('Routers use the destination IP information to choose a route');
    expect(rebuild).toContain('Receiving uses the same stack in reverse');
  });

  it('turns routing into an explicit header-table-next-hop loop',()=>{
    for(const term of ['READ THE HEADER','LOOK UP THE ROUTE','CHOOSE THE NEXT HOP','FORWARD · REPEAT · ARRIVE']){
      expect(rebuild).toContain(term);
    }
    expect(rebuild).toContain('network destination, hops/metrics, gateway, netmask and interface');
    expect(rebuild).toContain('hop number reaches 0');
    expect(rebuild).toContain('header → routing-table lookup → next-hop decision → forwarding → repeat → reassembly');
  });

  it('routes only the selected Chapter 14 flagship scenes through the new surface',()=>{
    expect(facade).toContain("import { Chapter14PresentationRebuild, hasChapter14PresentationRebuild }");
    expect(facade).toContain('if(hasChapter14PresentationRebuild(beat))return <Chapter14PresentationRebuild');
    for(const id of ['h14p-141-stack','h14p-141-units','h14p-142-routing']){
      expect(rebuild).toContain(id);
      expect(runtime).toContain(id);
    }
    expect(facade).toContain('Chapter14PresentationContentFinal');
    expect(facade).toContain('Chapter14EndOfChapterMaster');
  });

  it('loads its isolated projector layer last and keeps unrevealed teaching content present',()=>{
    expect(facade.trim().indexOf("./chapter14-presentation-rebuild.css")).toBeGreaterThan(facade.indexOf("./chapter14-presentation-final-source.css"));
    expect(css).toContain('.h14r-layer.is-current');
    expect(css).toContain('.h14r-unit.is-current');
    expect(css).toContain('.h14r-routing-stage.is-current');
    expect(css).toContain('opacity:.68');
    expect(css).toContain('opacity:.62');
    expect(css).not.toContain('.is-upcoming{display:none');
  });
});
