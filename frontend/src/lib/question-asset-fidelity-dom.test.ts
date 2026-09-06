import { describe, expect, it } from 'vitest';
import { browserAssetUrl, enhanceQuestionAsset, isSvgAsset, svgAssetDataUrl } from './question-asset-fidelity-dom';

function asset(kind: string, value: string, label = 'Source asset · source page 7') {
  const host = document.createElement('div');
  host.className = 'qb-asset';
  const strong = document.createElement('strong');
  strong.textContent = kind;
  const span = document.createElement('span');
  span.textContent = label;
  const pre = document.createElement('pre');
  pre.textContent = value;
  host.append(strong, span, pre);
  return host;
}

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

  it('decodes a server-projected signed storage URL', () => {
    const url = 'https://project.supabase.co/storage/v1/object/sign/question-assets/a.png?token=temp';
    const marker = `[[browser_asset_url:${encodeURIComponent(url)}]]`;
    expect(browserAssetUrl(marker)).toBe(url);
  });

  it('rejects unsafe projected URLs', () => {
    expect(browserAssetUrl('[[browser_asset_url:javascript%3Aalert(1)]]')).toBeNull();
    expect(browserAssetUrl('ordinary text')).toBeNull();
  });

  it('renders a legacy table asset as a real semantic table', () => {
    const host = asset('table', '| A | B | X |\n| --- | --- | --- |\n| 0 | 0 | 1 |\n| 0 | 1 | |', 'Truth table · source page 7');
    enhanceQuestionAsset(host);
    const table = host.querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.querySelectorAll('th')).toHaveLength(3);
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(table?.querySelector('td[data-editable="true"]')).not.toBeNull();
    expect(host.querySelector(':scope > pre')).toBeNull();
  });

  it('renders legacy pseudocode as code rather than generic context prose', () => {
    const host = asset('pseudocode', 'INPUT X\nIF X > 0 THEN\n  OUTPUT X\nENDIF');
    enhanceQuestionAsset(host);
    expect(host.querySelector('pre.structured-question-code code')?.textContent).toContain('IF X > 0 THEN');
  });

  it('never exposes a prose diagram substitute as the source visual', () => {
    const host = asset('diagram', 'Use the original PDF for exact gate symbols and connector geometry.');
    enhanceQuestionAsset(host);
    expect(host.textContent).not.toContain('Use the original PDF');
    expect(host.querySelector('[data-source-asset-unavailable="true"]')?.textContent).toBe('Original diagramma yuklanmadi.');
  });

  it('fails closed when a table asset is only a prose summary', () => {
    const host = asset('table', 'Database table with columns Code, Name and Price.');
    enhanceQuestionAsset(host);
    expect(host.textContent).not.toContain('Database table with columns');
    expect(host.querySelector('[data-source-asset-unavailable="true"]')?.textContent).toBe('Original jadval yuklanmadi.');
  });
});
