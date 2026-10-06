import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css=readFileSync(resolve(process.cwd(),'src/live/live-exam.css'),'utf8');

describe('Live Challenge source visual layout',()=>{
  it('renders canonical source diagrams at readable paper scale',()=>{
    expect(css).toContain('.live-question-card .structured-question-asset img');
    expect(css).toContain('width:min(100%,900px)');
    expect(css).toContain('max-height:none');
    expect(css).toContain('.live-projector-overlay .live-question-card .structured-question-asset img');
    expect(css).toContain('width:min(100%,1100px)');
  });
});
