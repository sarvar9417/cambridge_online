import { describe, expect, it } from 'vitest';
import { isSvgAsset, svgAssetDataUrl } from './question-asset-fidelity-dom';

describe('question asset fidelity helpers', () => {
  it('recognises an SVG portable asset', () => {
    expect(isSvgAsset('<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>')).toBe(true);
    expect(isSvgAsset('| A | B |')).toBe(false);
  });

  it('uses an encoded image URL rather than injecting SVG markup into the DOM', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>x & y</text></svg>';
    const url = svgAssetDataUrl(svg);
    expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(url).toContain('%3Csvg');
    expect(url).not.toContain('<svg');
  });
});
