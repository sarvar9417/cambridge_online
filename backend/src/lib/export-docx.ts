import type { ExportMode, ExportQuestion } from './export-html.js';
import { assertPortableAssetCoverage } from './export-html.js';

const x=(value:unknown)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const run=(text:string,bold=false,mono=false)=>`<w:r><w:rPr>${bold?'<w:b/>':''}${mono?'<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>':''}</w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
const para=(text:string='',opts:{bold?:boolean;mono?:boolean;style?:string;pageBreak?:boolean}={})=>`<w:p><w:pPr>${opts.style?`<w:pStyle w:val="${opts.style}"/>`:''}${opts.pageBreak?'<w:pageBreakBefore/>':''}</w:pPr>${text.split('\n').map((line,index)=>`${index?'<w:r><w:br/></w:r>':''}${run(line,opts.bold,opts.mono)}`).join('')}</w:p>`;

function markdownTable(value:string){
  const lines=value.trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<2||!lines[0]?.includes('|')||!/^\s*\|?\s*:?-{3,}/.test(lines[1]??''))return null;
  const rows=[lines[0]!,...lines.slice(2)].map(line=>line.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim()));
  const cols=Math.max(...rows.map(row=>row.length));
  return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${rows.map((row,ri)=>`<w:tr>${Array.from({length:cols},(_,ci)=>`<w:tc><w:tcPr><w:tcW w:w="${Math.floor(9000/cols)}" w:type="dxa"/></w:tcPr>${para(row[ci]??'',{bold:ri===0})}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
}

function assetXml(content:string,kind:string,alt?:string|null){const table=markdownTable(content);return `${alt?para(alt,{bold:true}):''}${table??para(content,{mono:kind==='code'||kind==='pseudocode'||kind==='table'})}`}
function contextXml(question:ExportQuestion){
  const blocks=question.contextBlocks??[];
  if(!blocks.length)return question.context?para(question.context):'';
  return blocks.map(block=>`${block.displayRef?para(block.displayRef,{bold:true}):''}${block.context?para(block.context):''}${(block.assets??[]).map(asset=>asset.contentMd?assetXml(asset.contentMd,asset.kind,asset.altText):'').join('')}`).join('');
}
function schemeXml(question:ExportQuestion){return (question.points??[]).map(point=>para(`${point.code}  ${point.text}  [${point.marks}]`)).join('')||para('No atomic mark-scheme points are available for this item.')}
function answerSpace(question:ExportQuestion){const count=Math.max(0,Math.min(12,question.answerLines??Math.max(2,question.marks*2)));return Array.from({length:count},()=>para('________________________________________________________________________________')).join('')}

function documentXml(title:string,questions:ExportQuestion[],mode:ExportMode){
  const total=questions.reduce((sum,q)=>sum+(q.role==='context_only'?0:q.marks),0);
  const header=`${para(title,{style:'Title'})}${para('Cambridge International AS & A Level Computer Science 9618')}${para(`Total: ${total}`,{bold:true})}`;
  const candidate=mode==='mark_scheme'?para('Mark Scheme',{style:'Heading1'}):`${para('Name: ______________________________    Class: __________________    Date: __________________')}`;
  const questionSection=mode==='mark_scheme'?'':questions.map(q=>`${para(`${q.displayRef}${q.role==='context_only'?'  Context':`  [${q.marks}]`}`,{bold:true})}${contextXml(q)}${para(q.stem)}${q.sourceRef?para(`Source: ${q.sourceRef}`):''}${q.role!=='context_only'?answerSpace(q):''}${mode==='combined'&&q.role!=='context_only'?`${para('Mark scheme',{bold:true})}${schemeXml(q)}`:''}`).join('');
  const schemeSection=mode==='mark_scheme'?questions.filter(q=>q.role!=='context_only').map(q=>`${para(`${q.displayRef}  [${q.marks}]`,{bold:true})}${q.sourceRef?para(`Source: ${q.sourceRef}`):''}${schemeXml(q)}`).join(''):'';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${header}${candidate}${questionSection}${schemeSection}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020"/></w:sectPr></w:body></w:document>`;
}

const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="34"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style></w:styles>`;
const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
const documentRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
const core=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>CamPath</dc:creator><dc:title>Cambridge 9618 worksheet</dc:title></cp:coreProperties>`;

const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function crc32(buf:Buffer){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&0xff]!^(c>>>8);return (c^0xffffffff)>>>0}
function zip(entries:Array<[string,string]>){
  const locals:Buffer[]=[],centrals:Buffer[]=[];let offset=0;
  for(const [name,text] of entries){const n=Buffer.from(name),data=Buffer.from(text,'utf8'),crc=crc32(data);const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0,6);local.writeUInt16LE(0,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(n.length,26);locals.push(local,n,data);const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(n.length,28);central.writeUInt32LE(offset,42);centrals.push(central,n);offset+=local.length+n.length+data.length}
  const cd=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,cd,end]);
}

export function buildDocx(title:string,questions:ExportQuestion[],mode:ExportMode='question_paper'){
  assertPortableAssetCoverage(questions);
  return zip([
    ['[Content_Types].xml',contentTypes],['_rels/.rels',rels],['word/document.xml',documentXml(title,questions,mode)],['word/styles.xml',styles],['word/_rels/document.xml.rels',documentRels],['docProps/core.xml',core],
  ]);
}
