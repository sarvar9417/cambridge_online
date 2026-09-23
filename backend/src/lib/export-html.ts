import { structureQuestionText } from './question-structure.js';
import type { StructuredQuestionContent } from './structured-question-content.js';
import { renderStructuredQuestionHtml,structuredQuestionPrintCss } from './structured-question-export.js';

const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export type ExportMode='question_paper'|'mark_scheme'|'combined'|'feedback';
export interface ExportAsset{id?:string;kind:string;contentMd?:string|null;storagePath?:string|null;altText?:string|null;sourcePage?:number|null;cropStatus?:string|null}
export interface ExportContextBlock{displayRef?:string;context?:string|null;assets?:ExportAsset[]}
export interface ExportSchemePoint{
  code:string;
  text:string;
  marks:number;
  accept?:unknown;
  reject?:unknown;
  requires?:unknown;
  groupLabel?:string|null;
  groupNRequired?:number|null;
  groupMaxMarks?:number|null;
  groupAwardMode?:string|null;
  groupSortOrder?:number|null;
}
export interface ExportQuestion{displayRef:string;sourceRef?:string;stem:string;contentJson?:StructuredQuestionContent|null;context?:string;contextBlocks?:ExportContextBlock[];marks:number;answerLines?:number|null;role?:'graded'|'context_only';schemeStatus?:string;schemeGuidance?:string|null;points?:ExportSchemePoint[]}

export function assertPaperTotal(questions:ExportQuestion[],expected:number){const actual=questions.reduce((sum,q)=>sum+(q.role==='context_only'?0:q.marks),0);if(actual!==expected)throw new Error(`export_total_mismatch:${actual}/${expected}`);return actual}
export function assertPortableAssetCoverage(questions:ExportQuestion[]){for(const q of questions){const assets=(q.contextBlocks??[]).flatMap(b=>b.assets??[]);for(const a of assets)if(a.storagePath&&!a.contentMd)throw new Error(`export_asset_unavailable:${q.sourceRef??q.displayRef}:${a.altText??a.kind}`);if(q.contentJson){const available=new Set(assets.filter(a=>a.id&&a.contentMd).map(a=>a.id));for(const block of q.contentJson.blocks)if(block.type==='asset'&&!available.has(block.assetId))throw new Error(`export_structured_asset_unavailable:${q.sourceRef??q.displayRef}:${block.assetId}`)}}}

function markdownTable(value:string){const lines=value.trim().split(/\r?\n/).filter(Boolean);if(lines.length<2||!lines[0]?.includes('|')||!/^\s*\|?\s*:?-{3,}/.test(lines[1]??''))return null;const rows=[lines[0]!,...lines.slice(2)].map(line=>line.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim()));return `<table>${rows.map((row,ri)=>`<tr>${row.map(cell=>ri===0?`<th>${esc(cell)}</th>`:`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</table>`}
const isSvg=(value:string)=>/^\s*<svg\b/i.test(value);
const svgDataUri=(value:string)=>`data:image/svg+xml;base64,${Buffer.from(value,'utf8').toString('base64')}`;
const renderAsset=(a:ExportAsset)=>{let body='';if(a.contentMd){if(isSvg(a.contentMd))body=`<img class="asset-image" src="${svgDataUri(a.contentMd)}" alt="${esc(a.altText??a.kind)}"/>`;else body=markdownTable(a.contentMd)??`<pre>${esc(a.contentMd)}</pre>`}return `<div class="asset"><strong>${esc(a.kind)}</strong>${a.altText?`<span>${esc(a.altText)}</span>`:''}${a.sourcePage?`<small>Source page ${esc(a.sourcePage)}</small>`:''}${body}</div>`};
function canonicalAssetIds(q:ExportQuestion){return new Set((q.contentJson?.blocks??[]).filter(block=>block.type==='asset').map(block=>block.type==='asset'?block.assetId:''))}
function structuredLegacyAssetSuperseded(q:ExportQuestion,asset:ExportAsset){
  if(!q.contentJson)return false;
  if(asset.id&&canonicalAssetIds(q).has(asset.id))return true;
  if(asset.sourcePage==null)return false;
  return q.contentJson.blocks.some(block=>
    block.source.page===asset.sourcePage&&(
      (asset.kind==='table'&&block.type==='table')
      ||((asset.kind==='code'||asset.kind==='pseudocode')&&block.type==='code')
    )
  );
}
const renderContextBlocks=(q:ExportQuestion)=>{const blocks=(q.contextBlocks??[]).map(block=>({...block,assets:(block.assets??[]).filter(asset=>!structuredLegacyAssetSuperseded(q,asset))})).filter(block=>Boolean(block.context)||(block.assets?.length??0)>0);if(!blocks.length)return q.context?`<p class="context">${esc(q.context)}</p>`:'';return `<div class="context-blocks">${blocks.map(b=>`<aside class="context-block">${b.displayRef?`<div class="context-ref">${esc(b.displayRef)}</div>`:''}${b.context?`<p class="context">${esc(b.context)}</p>`:''}${(b.assets??[]).map(renderAsset).join('')}</aside>`).join('')}</div>`};

function valueItems(value:unknown):string[]{
  if(value===null||value===undefined)return[];
  if(Array.isArray(value))return value.flatMap(valueItems);
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return[String(value)];
  if(typeof value==='object')return Object.entries(value as Record<string,unknown>).flatMap(([key,item])=>valueItems(item).map(text=>`${key}: ${text}`));
  return[];
}
function schemeGroupHeader(point:ExportSchemePoint){
  const parts:string[]=[];
  if(point.groupLabel)parts.push(point.groupLabel);
  if(point.groupNRequired)parts.push(`Any ${point.groupNRequired} from`);
  if(point.groupMaxMarks)parts.push(`max ${point.groupMaxMarks}`);
  if(point.groupAwardMode)parts.push(point.groupAwardMode.replaceAll('_',' '));
  return parts.join(' · ');
}
function renderScheme(q:ExportQuestion){
  let previousGroup='';
  const points=(q.points??[]).map(p=>{
    const group=schemeGroupHeader(p),groupHtml=group&&group!==previousGroup?`<li class="scheme-group">${esc(group)}</li>`:'';
    if(group)previousGroup=group;
    const accept=valueItems(p.accept),reject=valueItems(p.reject),requires=valueItems(p.requires);
    const notes=[accept.length?`<div class="scheme-note"><strong>Accept:</strong> ${accept.map(esc).join('; ')}</div>`:'',reject.length?`<div class="scheme-note"><strong>Reject:</strong> ${reject.map(esc).join('; ')}</div>`:'',requires.length?`<div class="scheme-note"><strong>Requires:</strong> ${requires.map(esc).join('; ')}</div>`:''].join('');
    return `${groupHtml}<li class="scheme-point"><strong>${esc(p.code)}</strong> ${esc(p.text)} <span>[${p.marks}]</span>${notes}</li>`;
  }).join('');
  const warning=q.schemeStatus&&q.schemeStatus!=='approved'?`<div class="scheme-warning">Mark scheme review status: ${esc(q.schemeStatus)} — source points are shown without promoting this review state.</div>`:'';
  const guidance=q.schemeGuidance?`<div class="scheme-guidance"><strong>Guidance:</strong> ${esc(q.schemeGuidance)}</div>`:'';
  return `${warning}${guidance}<ol class="scheme">${points||'<li class="scheme-empty">No atomic mark-scheme points are available for this item.</li>'}</ol>`;
}
const answerSpace=(q:ExportQuestion)=>{const count=Math.max(0,Math.min(12,q.answerLines??Math.max(2,q.marks*2)));return count?`<div class="answer-space">${Array.from({length:count},()=>'<div></div>').join('')}</div>`:''};

function renderLegacyStem(value:string){
  const blocks=structureQuestionText(value);
  return `<div class="stem">${blocks.map(block=>{
    if(block.type==='code')return `<pre class="stem-code">${esc(block.text)}</pre>`;
    if(block.type==='list')return `<ul class="stem-list">${block.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
    if(block.type==='table')return markdownTable(block.rows.join('\n'))??`<pre class="stem-table">${esc(block.rows.join('\n'))}</pre>`;
    if(block.type==='task')return `<div class="stem-task"><small>TASK</small>${esc(block.text)}</div>`;
    return `<p class="stem-paragraph">${esc(block.text)}</p>`;
  }).join('')}</div>`;
}

function renderQuestionStem(q:ExportQuestion){
  if(!q.contentJson)return renderLegacyStem(q.stem);
  const assets=(q.contextBlocks??[]).flatMap(block=>block.assets??[]).flatMap(asset=>{
    if(!asset.id)return [];
    const dataUri=asset.contentMd&&isSvg(asset.contentMd)?svgDataUri(asset.contentMd):asset.contentMd?.startsWith('data:')?asset.contentMd:null;
    return [{id:asset.id,dataUri,altText:asset.altText??asset.kind}];
  });
  return renderStructuredQuestionHtml(q.contentJson,{assets});
}

export function renderPaperHtml(title:string,questions:ExportQuestion[],modeOrScheme:ExportMode|boolean='question_paper',watermark?:string){
  assertPortableAssetCoverage(questions);const mode:ExportMode=typeof modeOrScheme==='boolean'?(modeOrScheme?'combined':'question_paper'):modeOrScheme,total=questions.reduce((sum,q)=>sum+(q.role==='context_only'?0:q.marks),0),showQuestions=mode!=='mark_scheme',showScheme=mode==='combined'||mode==='mark_scheme'||mode==='feedback';
  const questionBody=showQuestions?questions.map(q=>`<section class="question${q.role==='context_only'?' context-only':''}"><div><span class="ref">${esc(q.displayRef)}</span>${q.role==='context_only'?'<span class="context-label">Context</span>':`<span class="marks">[${q.marks}]</span>`}</div>${renderContextBlocks(q)}${renderQuestionStem(q)}${q.sourceRef?`<div class="source-ref">Source: ${esc(q.sourceRef)}</div>`:''}${q.role!=='context_only'&&mode!=='feedback'?answerSpace(q):''}${showScheme&&q.role!=='context_only'?renderScheme(q):''}</section>`).join(''):questions.filter(q=>q.role!=='context_only').map(q=>`<section class="question scheme-only"><div><span class="ref">${esc(q.displayRef)}</span><span class="marks">[${q.marks}]</span></div>${renderContextBlocks(q)}${renderQuestionStem(q)}${q.sourceRef?`<div class="source-ref">Source: ${esc(q.sourceRef)}</div>`:''}${renderScheme(q)}</section>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#111;font-size:11pt;line-height:1.35}h1{font-size:18pt;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:8px}.meta{display:flex;justify-content:space-between;gap:12px}.candidate{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin:20px 0 24px}.candidate span{border-bottom:1px solid #555;padding-bottom:4px;color:#444}.question{break-inside:avoid;margin:18px 0}.question.context-only{border:1px solid #bbb;background:#f7f7f7;padding:10px 12px}.ref{font-weight:bold}.marks{float:right}.context-label{float:right;font-size:9pt;font-weight:bold;color:#555;text-transform:uppercase}.context{white-space:pre-wrap}.stem{margin:8px 0}.stem-paragraph{margin:6px 0}.stem-code,.stem-table{white-space:pre-wrap;font:9.5pt/1.45 "Courier New",monospace;border:1px solid #bbb;background:#f6f7f9;padding:7px 9px;margin:7px 0}.stem-list{margin:7px 0 7px 22px;padding:0}.stem-list li{margin:4px 0}.stem-task{border-left:3px solid #444;background:#f6f6f6;padding:7px 9px;margin:8px 0;font-weight:bold}.stem-task small{display:block;font-size:7.5pt;letter-spacing:.1em;color:#666;margin-bottom:3px}.stem table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:7px 0}.stem th,.stem td{border:1px solid #777;padding:5px;text-align:left}.context-blocks{display:grid;gap:6px;margin:7px 0}.context-block{border-left:3px solid #777;padding:5px 8px;background:#fafafa}.context-ref{font-size:9pt;font-weight:bold;color:#555}.asset{display:grid;gap:3px;margin:6px 0;padding:7px;border:1px solid #ccc;background:#fff}.asset span,.asset small{font-size:9pt;color:#555}.asset pre{white-space:pre-wrap;font:9pt/1.4 "Courier New",monospace;margin:4px 0 0}.asset-image{display:block;max-width:100%;max-height:155mm;width:auto;height:auto;margin:6px auto}.asset table{border-collapse:collapse;width:100%;font-size:9pt;margin-top:5px}.asset th,.asset td{border:1px solid #777;padding:5px;text-align:left;vertical-align:top}.source-ref{font-size:8.5pt;color:#666;margin-top:5px}.answer-space{margin:12px 0}.answer-space div{height:18px;border-bottom:1px solid #bbb}.scheme-warning{border:1px solid #9a6b00;background:#fff8df;padding:7px;margin:8px 0;font-size:9pt}.scheme-guidance{white-space:pre-wrap;border-left:3px solid #555;background:#f7f7f7;padding:7px 9px;margin:8px 0;font-size:9.5pt}.scheme{margin:8px 0 0 24px}.scheme li{margin:5px 0}.scheme-group{list-style:none;margin-left:-20px!important;font-weight:bold;padding-top:5px}.scheme-note{font-size:9pt;color:#444;margin:2px 0 0 16px}.scheme-empty{color:#666}.scheme-only{border-bottom:1px solid #ddd;padding-bottom:10px}footer{position:fixed;bottom:0;font-size:9pt}.watermark{position:fixed;inset:45% 0 auto;z-index:-1;text-align:center;transform:rotate(-28deg);font-size:34pt;font-weight:bold;color:rgba(50,50,50,.08);white-space:nowrap}${structuredQuestionPrintCss}</style></head><body>${watermark?`<div class="watermark">${esc(watermark)}</div>`:''}<h1>${esc(title)}</h1><div class="meta"><span>Cambridge International Computer Science</span><strong>Total: ${total}</strong></div>${mode!=='mark_scheme'?'<div class="candidate"><span>Name:</span><span>Class:</span><span>Date:</span></div>':'<h2>Mark Scheme</h2>'}${questionBody}<footer>${watermark?esc(watermark):'Generated by CamPath'}</footer></body></html>`;
}
