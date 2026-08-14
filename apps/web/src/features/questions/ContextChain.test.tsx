import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContextChain } from './ContextChain';
import type { Portable } from './types';

describe('ContextChain', () => {
  it('renders inherited context and assets in ancestor order', () => {
    const portable = {
      contextBlocks: [
        {
          id: 'root',
          displayRef: '3',
          context: 'Root context',
          assets: [
            {
              id: 'a',
              kind: 'diagram',
              storagePath: null,
              contentMd: 'Diagram caption',
              altText: 'Diagram',
              svgMarkup: '<svg><title>Diagram</title></svg>',
            },
          ],
        },
        { id: 'parent', displayRef: '3(a)', context: 'Parent context', assets: [] },
      ],
    } as Portable;
    const html = renderToStaticMarkup(<ContextChain portable={portable} />);
    expect(html.indexOf('Root context')).toBeLessThan(html.indexOf('Parent context'));
    expect(html).toContain('Diagram caption');
    expect(html).toContain('<svg>');
  });
});
