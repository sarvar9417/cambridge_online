import { describe,expect,it } from 'vitest';
import { liveJoinUrl,qrMatrix,qrSvg } from './qr-code';

describe('Live join QR',()=>{
  it('builds a stable deep link with only the six-digit room code',()=>{
    expect(liveJoinUrl('https://cambridge-online.vercel.app/','654321'))
      .toBe('https://cambridge-online.vercel.app/#oquvchi/live?code=654321');
    expect(()=>liveJoinUrl('https://example.test','123')).toThrow('live_join_code_invalid');
  });

  it('creates a valid square QR matrix with finder patterns and mixed modules',()=>{
    const matrix=qrMatrix(liveJoinUrl('https://cambridge-online.vercel.app','654321'));
    expect([33,37]).toContain(matrix.length);
    expect(matrix.every((row)=>row.length===matrix.length)).toBe(true);
    expect(matrix.flat().some(Boolean)).toBe(true);
    expect(matrix.flat().some((value)=>!value)).toBe(true);
    expect(matrix[0]?.slice(0,7)).toEqual([true,true,true,true,true,true,true]);
    expect(matrix[6]?.slice(0,7)).toEqual([true,true,true,true,true,true,true]);
  });

  it('emits self-contained SVG without external requests or embedded room metadata beyond the QR modules',()=>{
    const svg=qrSvg(liveJoinUrl('https://cambridge-online.vercel.app','654321'));
    expect(svg).toContain('<svg');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('<path');
    expect(svg).not.toContain('http://api.');
    expect(svg).not.toContain('654321');
  });
});
