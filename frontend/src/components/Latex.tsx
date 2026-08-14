import { useMemo } from 'react';
import { renderLatex } from '../lib/latex';

interface LatexProps {
  /** LaTeX-authored source; `$...$` and `$$...$$` become maths, the rest is prose. */
  source: string | null | undefined;
  className?: string;
  /** Renders inline (a `<span>`) rather than as a block. */
  inline?: boolean;
}

/**
 * Renders question and mark scheme text.
 *
 * `renderLatex` escapes every prose character and runs KaTeX with `trust:false`,
 * so the HTML handed to `dangerouslySetInnerHTML` contains only KaTeX's own
 * markup plus escaped text — never anything an author typed as raw HTML.
 */
export function Latex({ source, className, inline = false }: LatexProps) {
  const rendered = useMemo(() => renderLatex(source ?? ''), [source]);
  const Tag = inline ? 'span' : 'div';

  return (
    <Tag
      className={['latex', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: rendered.html }}
    />
  );
}

/**
 * Diagram asset. The SVG is validated on write (no script, no event handlers,
 * no external references) and stored inline so it needs no object storage.
 */
export function DiagramAsset({ svgMarkup, altText }: { svgMarkup: string; altText: string }) {
  return (
    <figure className="diagram" role="img" aria-label={altText}>
      <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      <figcaption>{altText}</figcaption>
    </figure>
  );
}
