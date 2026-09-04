import type { ExportMode, ExportQuestion } from './export-html.js';
import { assertPortableAssetCoverage } from './export-html.js';
import { structureQuestionText } from './question-structure.js';
import type { StructuredQuestionBlock } from './structured-question-content.js';
import { parseStructuredQuestionContent } from './structured-question-content.js';

const x=(value:unknown)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const run=(text:string,bold=false,mono=false)=>`<w:r><w:rPr>${bold?'<w:b/>':''}${mono?'<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>':''}</w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
const para=(text:string='',opts:{bold?:boolean;mono?:boolean;style?:string;pageBreak?:boolean}={})=>`<w:p><w:pPr>${opts.style?`<w:pStyle w:val="${opts.style}"/>`:''}${opts.pageBreak?'<w:pageBreakBefore/>':''}</w:pPr>${text.split('\n').map((line,index)=>`${index?'<w:r><w:br/></w:r>':''}${run(line,opts.bold,opts.mono)}`).join('')}</w:p>`;
const isSvg=(value:string)=>/^\s*<svg\b/i.test(value);

type Media={relId:string;name:string;data:string;cx:number;cy:number;alt:string;docPrId:number};
type BuildContext={media:Media[]};
type ZipData=string|Buffer;

function wordTable(rows:string[][],header=false){
  const cols=Math.max(1,...rows.map(row=>row.length));
  return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${rows.map((row,ri)=>`<w:tr>${Array.from({length:cols},(_,ci)=>`<w:tc><w:tcPr><w:tcW w:w="${Math.floor(9000/cols)}" w:type="dxa"/></w:tcPr>${para(row[ci]??'',{bold:header&&ri===0})}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
}

function markdownTable(value:string){
  const lines=value.trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<2||!lines[0]?.includes('|')||!/^\s*\|?\s*:?-{3,}/.test(lines[1]??''))return null;
  const rows=[lines[0]!,...lines.slice(2)].map(line=>line.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim()));
  return wordTable(rows,true);
}

function svgSize(svg:string){
  const viewBox=svg.match(/\bviewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  const width=Math.max(1,Number(viewBox?.[1]??svg.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1]??760));
  const height=Math.max(1,Number(viewBox?.[2]??svg.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1]??420));
  const maxW=5_850_000,maxH=6_900_000,scale=Math.min(maxW/width,maxH/height);
  return {cx:Math.round(width*scale),cy:Math.round(height*scale)};
}

function svgDrawing(content:string,alt:string,ctx:BuildContext){
  const index=ctx.media.length+1,{cx,cy}=svgSize(content),media:Media={relId:`rIdImage${index}`,name:`diagram-${index}.svg`,data:content,cx,cy,alt,docPrId:index+10};ctx.media.push(media);
  return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${media.docPrId}" name="Diagram ${index}" descr="${x(alt)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="${x(media.name)}" descr="${x(alt)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${media.relId}"><a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip r:embed="${media.relId}"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

function assetXml(content:string,kind:string,alt:string|null|undefined,ctx:BuildContext){
  if(isSvg(content))return `${alt?para(alt,{bold:true}):''}${svgDrawing(content,alt??kind,ctx)}`;
  const table=markdownTable(content);return `${alt?para(alt,{bold:true}):''}${table??para(content,{mono:kind==='code'||kind==='pseudocode'||kind==='table'})}`;
}
function contextXml(question:ExportQuestion,ctx:BuildContext){
  const blocks=question.contextBlocks??[];
  if(!blocks.length)return question.context?para(question.context):'';
  return blocks.map(block=>`${block.displayRef?para(block.displayRef,{bold:true}):''}${block.context?para(block.context):''}${(block.assets??[]).map(asset=>asset.contentMd?assetXml(asset.contentMd,asset.kind,asset.altText,ctx):'').join('')}`).join('');
}
function legacyStemXml(value:string){return structureQuestionText(value).map(block=>{
  if(block.type==='code')return para(block.text,{mono:true});
  if(block.type==='list')return block.items.map(item=>para(`•  ${item}`)).join('');
  if(block.type==='table')return markdownTable(block.rows.join('\n'))??para(block.rows.join('\n'),{mono:true});
  if(block.type==='task')return `${para('TASK',{bold:true})}${para(block.text,{bold:true})}`;
  return para(block.text);
}).join('')}

function booleanEquationText(latex:string){
  return latex
    .replace(/\\overline\{([^{}]+)\}/g,(_,value:string)=>[...value].map(char=>`${char}\u0305`).join(''))
    .replaceAll('\\land','∧')
    .replaceAll('\\lor','∨')
    .replaceAll('\\oplus','⊕')
    .replaceAll('\\neg','¬')
    .replaceAll('\\cdot','·')
    .replaceAll('\\mathrm{AND}','AND')
    .replaceAll('\\mathrm{OR}','OR')
    .replaceAll('\\mathrm{NOT}','NOT');
}
function mathXml(block:Extract<StructuredQuestionBlock,{type:'math'}>){
  const value=block.semantics==='boolean_expression'?booleanEquationText(block.latex):block.latex;
  return `<m:oMathPara><m:oMath><m:r><m:t>${x(value)}</m:t></m:r></m:oMath></m:oMathPara>`;
}
function structuredTableXml(block:Extract<StructuredQuestionBlock,{type:'table'}>){
  const rows:string[][]=[];
  if(block.headers.length)rows.push(block.headers);
  rows.push(...block.rows.map(row=>row.map(cell=>cell??'')));
  return wordTable(rows,block.headers.length>0);
}
function matchingXml(block:Extract<StructuredQuestionBlock,{type:'matching'}>){
  const count=Math.max(block.left.length,block.right.length);
  const rows=Array.from({length:count},(_,index)=>[
    block.left[index]?`${block.left[index]!.id}. ${block.left[index]!.text}`:'',
    block.right[index]?`${block.right[index]!.id}. ${block.right[index]!.text}`:'',
  ]);
  return wordTable(rows,false);
}
function structuredAssetXml(question:ExportQuestion,block:Extract<StructuredQuestionBlock,{type:'asset'}>,ctx:BuildContext){
  const asset=(question.contextBlocks??[]).flatMap(item=>item.assets??[]).find(item=>item.id===block.assetId);
  if(!asset?.contentMd)throw new Error(`export_structured_asset_unavailable:${question.sourceRef??question.displayRef}:${block.assetId}`);
  if(!isSvg(asset.contentMd))throw new Error(`export_structured_asset_not_embeddable:${question.sourceRef??question.displayRef}:${block.assetId}`);
  return svgDrawing(asset.contentMd,block.altText||asset.altText||block.kind,ctx);
}
function structuredStemXml(question:ExportQuestion,ctx:BuildContext){
  if(!question.contentJson)return legacyStemXml(question.stem);
  const content=parseStructuredQuestionContent(question.contentJson);
  return content.blocks.map(block=>{
    if(block.type==='text')return block.style==='task'?`${para('TASK',{bold:true})}${para(block.text,{bold:true})}`:para(block.text);
    if(block.type==='math')return mathXml(block);
    if(block.type==='code')return para(block.text,{mono:true});
    if(block.type==='list')return block.items.map(item=>para(`•  ${item}`)).join('');
    if(block.type==='table')return structuredTableXml(block);
    if(block.type==='matching')return matchingXml(block);
    if(block.type==='asset')return structuredAssetXml(question,block,ctx);
    const count=block.lines??(block.kind==='lines'?3:1);
    return Array.from({length:Math.max(1,Math.min(12,count))},()=>para('________________________________________________________________________________')).join('');
  }).join('');
}
function schemeXml(question:ExportQuestion){const warning=question.schemeStatus&&question.schemeStatus!=='approved'?para(`Mark scheme review status: ${question.schemeStatus} — source points are shown without promoting this review state.`,{bold:true}):'';return warning+((question.points??[]).map(point=>para(`${point.code}  ${point.text}  [${point.marks}]`)).join('')||para('No atomic mark-scheme points are available for this item.'))}
function answerSpace(question:ExportQuestion){const count=Math.max(0,Math.min(12,question.answerLines??Math.max(2,question.marks*2)));return Array.from({length:count},()=>para('________________________________________________________________________________')).join('')}

function documentXml(title:string,questions:ExportQuestion[],mode:ExportMode,ctx:BuildContext){
  const total=questions.reduce((sum,q)=>sum+(q.role==='context_only'?0:q.marks),0);
  const header=`${para(title,{style:'Title'})}${para('Cambridge International Computer Science')}${para(`Total: ${total}`,{bold:true})}`;
  const candidate=mode==='mark_scheme'?para('Mark Scheme',{style:'Heading1'}):para('Name: ______________________________    Class: __________________    Date: __________________');
  const questionSection=mode==='mark_scheme'?'':questions.map(q=>`${para(`${q.displayRef}${q.role==='context_only'?'  Context':`  [${q.marks}]`}`,{bold:true})}${contextXml(q,ctx)}${structuredStemXml(q,ctx)}${q.sourceRef?para(`Source: ${q.sourceRef}`):''}${q.role!=='context_only'?answerSpace(q):''}${mode==='combined'&&q.role!=='context_only'?`${para('Mark scheme',{bold:true})}${schemeXml(q)}`:''}`).join('');
  const schemeSection=mode==='mark_scheme'?questions.filter(q=>q.role!=='context_only').map(q=>`${para(`${q.displayRef}  [${q.marks}]`,{bold:true})}${q.sourceRef?para(`Source: ${q.sourceRef}`):''}${schemeXml(q)}`).join(''):'';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main"><w:body>${header}${candidate}${questionSection}${schemeSection}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020"/></w:sectPr></w:body></w:document>`;
}

const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="34"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style></w:styles>`;
const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="svg" ContentType="image/svg+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
const documentRels=(ctx:BuildContext)=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${ctx.media.map(media=>`<Relationship Id="${media.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${x(media.name)}"/>`).join('')}</Relationships>`;
const core=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>CamPath</dc:creator><dc:title>Cambridge worksheet</dc:title></cp:coreProperties>`;

const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function crc32(buf:Buffer){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&0xff]!^(c>>>8);return (c^0xffffffff)>>>0}
function zip(entries:Array<[string,ZipData]>){
  const locals:Buffer[]=[],centrals:Buffer[]=[];let offset=0;
  for(const [name,value] of entries){const n=Buffer.from(name),data=Buffer.isBuffer(value)?value:Buffer.from(value,'utf8'),crc=crc32(data);const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0,6);local.writeUInt16LE(0,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(n.length,26);locals.push(local,n,data);const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(n.length,28);central.writeUInt32LE(offset,42);centrals.push(central,n);offset+=local.length+n.length+data.length}
  const cd=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,cd,end]);
}

export function buildDocx(title:string,questions:ExportQuestion[],mode:ExportMode='question_paper'){
  assertPortableAssetCoverage(questions);const ctx:BuildContext={media:[]},document=documentXml(title,questions,mode,ctx);
  return zip([
    ['[Content_Types].xml',contentTypes],['_rels/.rels',rels],['word/document.xml',document],['word/styles.xml',styles],['word/_rels/document.xml.rels',documentRels(ctx)],['docProps/core.xml',core],
    ...ctx.media.map(media=>[`word/media/${media.name}`,media.data] as [string,ZipData]),
  ]);
}
