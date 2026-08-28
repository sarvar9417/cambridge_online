const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export type ExportMode='question_paper'|'mark_scheme'|'combined'|'feedback';
export interface ExportAsset{kind:string;contentMd?:string|null;storagePath?:string|null;altText?:string|null;sourcePage?:number|null}
export interface ExportContextBlock{displayRef?:string;context?:string|null;assets?:ExportAsset[]}
export interface ExportQuestion{
  displayRef:string;sourceRef?:string;stem:string;context?:string;contextBlocks?:ExportContextBlock[];
  marks:number;answerLines?:number|null;role?:'graded'|'context_only';points?:Array<{code:string;text:string;marks:number}>;
}

export function assertPaperTotal(questions:ExportQuestion[],expected:number){const actual=questions.reduce((sum,q)=>sum+(q.role==='context_only'?0:q.marks),0);if(actual!==expected)throw new Error(`export_total_mismatch:${actual}/${expected}`);return actual}
export function assertPortableAssetCoverage(questions:ExportQuestion[]){for(const q of questions)for(const b of q.contextBlocks??[])for(const a of b.assets??[])if(a.storagePath&&!a.contentMd)throw new Error(`export_asset_unavailable:${q.sourceRef??q.displayRef}:${a.altText??a.kind}`)}

const renderAsset=(a:ExportAsset)=>`<div class="asset"><strong>${esc(a.kind)}</strong>${a.altText?`<span>${esc(a.altText)}</span>`:''}${a.sourcePage?`<small>Source page ${esc(a.sourcePage)}</small>`:''}${a.contentMd?`<pre>${esc(a.contentMd)}</pre>`:''}</div>`;
const renderContextBlocks=(q:ExportQuestion)=>{const blocks=q.contextBlocks??[];if(!blocks.length)return q.context?`<p class="context">${esc(q.context)}</p>`:'';return `<div class="context-blocks">${blocks.map(b=>`<aside class="context-block">${b.displayRef?`<div class="context-ref">${esc(b.displayRef)}</div>`:''}${b.context?`<p class="context">${esc(b.context)}</p>`:''}${(b.assets??[]).map(renderAsset).join('')}</aside>`).join('')}</div>`};
const renderScheme=(q:ExportQuestion)=>`<ol class="scheme">${(q.points??[]).map(p=>`<li><strong>${esc(p.code)}</strong> ${esc(p.text)} <span>[${p.marks}]</span></li>`).join('')}</ol>`;
const answerSpace=(q:ExportQuestion)=>{const count=Math.max(0,Math.min(12,q.answerLines??Math.max(2,q.marks*2)));return count?`<div class="answer-space">${Array.from({length:count},()=>'<div></div>').join('')}</div>`:''};

export function renderPaperHtml(title:string,questions:ExportQuestion[],modeOrScheme:ExportMode|boolean='question_paper',watermark?:string){
  assertPortableAssetCoverage(questions);
  const mode:ExportMode=typeof modeOrScheme==='boolean'?(modeOrScheme?'combined':'question_paper'):modeOrScheme;
  const total=questions.reduce((sum,q)=>sum+(q.role==='context_only'?0:q.marks),0);
  const showQuestions=mode!=='mark_scheme',showScheme=mode==='combined'||mode==='mark_scheme'||mode==='feedback';
  const questionBody=showQuestions?questions.map(q=>`<section class="question${q.role==='context_only'?' context-only':''}"><div><span class="ref">${esc(q.displayRef)}</span>${q.role==='context_only'?'<span class="context-label">Context</span>':`<span class="marks">[${q.marks}]</span>`}</div>${renderContextBlocks(q)}<p class="stem">${esc(q.stem)}</p>${q.sourceRef?`<div class="source-ref">Source: ${esc(q.sourceRef)}</div>`:''}${q.role!=='context_only'&&mode!=='feedback'?answerSpace(q):''}${showScheme&&q.role!=='context_only'?renderScheme(q):''}</section>`).join(''):questions.filter(q=>q.role!=='context_only').map(q=>`<section class="question scheme-only"><div><span class="ref">${esc(q.displayRef)}</span><span class="marks">[${q.marks}]</span></div>${q.sourceRef?`<div class="source-ref">Source: ${esc(q.sourceRef)}</div>`:''}${renderScheme(q)}</section>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#111;font-size:11pt;line-height:1.35}h1{font-size:18pt;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:8px}
    .meta{display:flex;justify-content:space-between;gap:12px}.candidate{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin:20px 0 24px}.candidate span{border-bottom:1px solid #555;padding-bottom:4px;color:#444}
    .question{break-inside:avoid;margin:18px 0}.question.context-only{border:1px solid #bbb;background:#f7f7f7;padding:10px 12px}.ref{font-weight:bold}.marks{float:right}.context-label{float:right;font-size:9pt;font-weight:bold;color:#555;text-transform:uppercase}
    .stem,.context{white-space:pre-wrap}.context-blocks{display:grid;gap:6px;margin:7px 0}.context-block{border-left:3px solid #777;padding:5px 8px;background:#fafafa}.context-ref{font-size:9pt;font-weight:bold;color:#555}
    .asset{display:grid;gap:3px;margin:6px 0;padding:7px;border:1px solid #ccc;background:#fff}.asset span,.asset small{font-size:9pt;color:#555}.asset pre{white-space:pre-wrap;font:9pt/1.4 "Courier New",monospace;margin:4px 0 0}
    .source-ref{font-size:8.5pt;color:#666;margin-top:5px}.answer-space{margin:12px 0}.answer-space div{height:18px;border-bottom:1px solid #bbb}.scheme{margin:8px 0 0 24px}.scheme li{margin:5px 0}.scheme-only{border-bottom:1px solid #ddd;padding-bottom:10px}
    footer{position:fixed;bottom:0;font-size:9pt}.watermark{position:fixed;inset:45% 0 auto;z-index:-1;text-align:center;transform:rotate(-28deg);font-size:34pt;font-weight:bold;color:rgba(50,50,50,.08);white-space:nowrap}
  </style></head><body>${watermark?`<div class="watermark">${esc(watermark)}</div>`:''}<h1>${esc(title)}</h1><div class="meta"><span>Cambridge International AS & A Level Computer Science 9618</span><strong>Total: ${total}</strong></div>${mode!=='mark_scheme'?'<div class="candidate"><span>Name:</span><span>Class:</span><span>Date:</span></div>':'<h2>Mark Scheme</h2>'}${questionBody}<footer>${watermark?esc(watermark):'Generated by CamPath'}</footer></body></html>`;
}
