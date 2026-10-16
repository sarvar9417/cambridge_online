import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LiveJoinQr, liveJoinQrPath, liveJoinUrl } from './LiveJoinQr';

describe('Live join QR',()=>{
  it('builds a same-origin hash link with only the six-digit room code',()=>{
    expect(liveJoinUrl('654321','https://cambridge.example/app?old=1#oqitish/live?id=secret'))
      .toBe('https://cambridge.example/app#oquvchi/live?code=654321');
  });

  it('rejects malformed join codes instead of encoding an ambiguous link',()=>{
    expect(()=>liveJoinUrl('12345','https://cambridge.example/')).toThrow('live_join_code_invalid');
    expect(()=>liveJoinUrl('abcdef','https://cambridge.example/')).toThrow('live_join_code_invalid');
  });

  it('renders a deterministic local SVG QR without third-party image URLs',()=>{
    const url='https://cambridge.example/#oquvchi/live?code=654321';
    const first=liveJoinQrPath(url);
    const second=liveJoinQrPath(url);
    expect(first).toEqual(second);
    expect(first.size).toBeGreaterThan(20);
    expect(first.path.length).toBeGreaterThan(500);

    const markup=renderToStaticMarkup(<LiveJoinQr code="654321"/>);
    expect(markup).toContain('<svg');
    expect(markup).toContain('Live Challenge 654321 xonasiga kirish uchun QR kod');
    expect(markup).toContain('live-join-qr-modules');
    expect(markup).not.toContain('http://');
    expect(markup).not.toContain('https://');
  });
});
