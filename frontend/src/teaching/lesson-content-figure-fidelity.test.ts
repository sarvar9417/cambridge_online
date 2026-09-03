import { expect, it } from 'vitest';
import { lessonChapter } from './lesson-content-source-complete';

it('keeps Hodder Figure 1.8 exact 8 × 8 RGB/black source pattern',()=>{
  const chapter=lessonChapter(1)!;
  const slide=chapter.slides.find(item=>item.id==='h1-rle-images');
  expect(slide).toBeTruthy();
  const figureBlock=(slide?.richBlocks??[]).find(
    block=>block.kind==='figure'&&block.figure.kind==='grid'&&block.figure.title.startsWith('Figure 1.8'),
  );
  expect(figureBlock?.kind).toBe('figure');
  if(!figureBlock||figureBlock.kind!=='figure'||figureBlock.figure.kind!=='grid')return;

  expect(figureBlock.figure.rows).toEqual([
    'BBGGGGBB',
    'BWWWWWWB',
    'GGRRRRGG',
    'GGWRRWGG',
    'GGRRRRGG',
    'GGWWWWGG',
    'BWWRRWWB',
    'BBGGGGBB',
  ]);
  expect(figureBlock.figure.legend).toEqual([
    {symbol:'B',label:'black · 0,0,0'},
    {symbol:'W',label:'white · 255,255,255'},
    {symbol:'G',label:'green · 0,255,0'},
    {symbol:'R',label:'red · 255,0,0'},
  ]);
  expect(figureBlock.figure.caption).toContain('192');
  expect(figureBlock.figure.caption).toContain('92');
});
