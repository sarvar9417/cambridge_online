import {
  parseStructuredQuestionContent,
  type StructuredQuestionBlock,
  type StructuredQuestionContent,
} from './structured-question-content.js';

export type StructuredExportAsset = {
  id: string;
  url?: string | null;
  dataUri?: string | null;
  altText?: string | null;
};

export type StructuredExportOptions = {
  assets?: StructuredExportAsset[];
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function renderBooleanLatex(latex: string) {
  let rendered = escapeHtml(latex);
  rendered = rendered.replace(/\\overline\{([^{}]+)\}/g, '<span class="sq-overline">$1</span>');
  rendered = rendered
    .replaceAll('\\land', '∧')
    .replaceAll('\\lor', '∨')
    .replaceAll('\\oplus', '⊕')
    .replaceAll('\\neg', '¬')
    .replaceAll('\\cdot', '·')
    .replaceAll('\\mathrm{AND}', 'AND')
    .replaceAll('\\mathrm{OR}', 'OR')
    .replaceAll('\\mathrm{NOT}', 'NOT');
  return rendered;
}

function renderTable(block: Extract<StructuredQuestionBlock, { type: 'table' }>) {
  const head = block.headers.length
    ? `<thead><tr>${block.headers.map((value) => `<th>${escapeHtml(value)}</th>`).join('')}</tr></thead>`
    : '';
  const editable = new Set(block.editableCells.map(([row, column]) => `${row}:${column}`));
  const body = block.rows.map((row, rowIndex) => `<tr>${row.map((cell, columnIndex) => {
    const answer = editable.has(`${rowIndex}:${columnIndex}`) ? ' data-answer-cell="true"' : '';
    return `<td${answer}>${cell === null ? '' : escapeHtml(cell)}</td>`;
  }).join('')}</tr>`).join('');
  return `<table class="sq-table sq-${block.kind.replaceAll('_', '-')}" data-block="table" data-table-kind="${block.kind}">${head}<tbody>${body}</tbody></table>`;
}

function renderMatching(block: Extract<StructuredQuestionBlock, { type: 'matching' }>) {
  const side = (name: 'left' | 'right') => `<ol class="sq-matching-${name}">${block[name]
    .map((item) => `<li data-match-id="${escapeHtml(item.id)}">${escapeHtml(item.text)}</li>`)
    .join('')}</ol>`;
  return `<div class="sq-matching" data-block="matching">${side('left')}${side('right')}</div>`;
}

function renderBlock(
  block: StructuredQuestionBlock,
  assets: Map<string, StructuredExportAsset>,
) {
  const provenance = ` data-source-page="${block.source.page}"${block.source.bbox ? ` data-source-bbox="${block.source.bbox.join(',')}"` : ''}`;
  switch (block.type) {
    case 'text':
      return `<p class="sq-text sq-${block.style}" data-block="text"${provenance}>${escapeHtml(block.text)}</p>`;
    case 'math': {
      const body = block.semantics === 'boolean_expression'
        ? renderBooleanLatex(block.latex)
        : escapeHtml(block.latex);
      const tag = block.display ? 'div' : 'span';
      return `<${tag} class="sq-math sq-${block.semantics.replaceAll('_', '-')}" data-block="math" data-latex="${escapeHtml(block.latex)}"${provenance}>${body}</${tag}>`;
    }
    case 'code':
      return `<pre class="sq-code" data-block="code"${provenance}><code${block.language ? ` data-language="${escapeHtml(block.language)}"` : ''}>${escapeHtml(block.text)}</code></pre>`;
    case 'list':
      return `<ul class="sq-list" data-block="list"${provenance}>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    case 'table':
      return renderTable(block).replace(' data-block="table"', ` data-block="table"${provenance}`);
    case 'matching':
      return renderMatching(block).replace(' data-block="matching"', ` data-block="matching"${provenance}`);
    case 'asset': {
      const asset = assets.get(block.assetId);
      const src = asset?.dataUri ?? asset?.url ?? null;
      if (!src) {
        return `<figure class="sq-asset sq-${block.kind.replaceAll('_', '-')} sq-asset-missing" data-block="asset" data-asset-id="${block.assetId}"${provenance}><figcaption>${escapeHtml(block.altText || asset?.altText || 'Source visual')}</figcaption></figure>`;
      }
      const alt = block.altText || asset?.altText || 'Source visual';
      return `<figure class="sq-asset sq-${block.kind.replaceAll('_', '-')}" data-block="asset" data-asset-id="${block.assetId}"${provenance}><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"></figure>`;
    }
    case 'answer_area':
      return `<div class="sq-answer-area sq-answer-${block.kind.replaceAll('_', '-')}" data-block="answer_area" data-answer-kind="${block.kind}"${block.lines ? ` data-lines="${block.lines}"` : ''}${provenance}></div>`;
  }
}

export function renderStructuredQuestionHtml(
  value: StructuredQuestionContent | unknown,
  options: StructuredExportOptions = {},
) {
  const content = parseStructuredQuestionContent(value);
  const assets = new Map((options.assets ?? []).map((asset) => [asset.id, asset]));
  return `<div class="structured-question" data-content-version="1" data-source-paper-id="${content.source.paperId}" data-source-sha256="${content.source.sha256}">${content.blocks.map((block) => renderBlock(block, assets)).join('')}</div>`;
}

export const structuredQuestionPrintCss = `
.structured-question{font:inherit;color:inherit}.sq-text{margin:.35em 0;white-space:pre-wrap}.sq-task{font-weight:600}.sq-code{white-space:pre-wrap;border:1px solid #d7dce2;border-radius:6px;padding:8px;background:#f8fafc}.sq-list{margin:.4em 0 .6em 1.4em}.sq-table{border-collapse:collapse;width:100%;margin:.7em 0;break-inside:avoid}.sq-table th,.sq-table td{border:1px solid #20242a;padding:6px 8px;vertical-align:top}.sq-table [data-answer-cell="true"]{min-width:52px;height:28px}.sq-matching{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:.7em 0;break-inside:avoid}.sq-matching ol{margin:0;padding-left:1.5em}.sq-matching li{margin:.45em 0;min-height:1.35em}.sq-math{font-family:"Times New Roman",serif;font-size:1.05em;letter-spacing:.01em}.sq-math.sq-boolean-expression{font-family:Arial,sans-serif}.sq-overline{text-decoration:overline;text-decoration-thickness:1px}.sq-asset{margin:.7em 0;break-inside:avoid}.sq-asset img{display:block;max-width:100%;height:auto}.sq-asset-missing{border:1px dashed #aab2bd;padding:12px}.sq-answer-lines{min-height:4.5em;border-bottom:1px solid #c9ced5}
`;
