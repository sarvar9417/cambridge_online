import { api } from '../lib/api';
import { isStructuredQuestionContent, type StructuredQuestionContent } from '../lib/structured-question-content';
import { renderStructuredQuestionContent } from '../lib/structured-question-renderer';
import {
  materializePortableSourceAssets,
  portableAssetsForContent,
  portableAssetUrl,
  unresolvedVisualAsset,
  type PortableSourceAsset,
} from '../lib/portable-source-assets';

type MarkSchemePoint = {
  code:string;
  text:string;
  marks:number;
  accept?:unknown;
  reject?:unknown;
  requires?:unknown;
  isBod?:boolean;
};

type MarkSchemeGroup = {
  label?:string|null;
  nRequired?:number|null;
  marksPerPoint?:number|null;
  maxMarks?:number|null;
};

type MarkSchemeLevel = {
  levelNumber:number;
  minMarks:number;
  maxMarks:number;
  descriptorMd?:string|null;
  indicativeContentMd?:string|null;
};

type SourceAudit = {
  result:'verified'|'needs_review';
  sourcePage?:number|null;
  auditedAt?:string|null;
  evidence?:unknown;
};

type MarkScheme = {
  id:string;
  status:'approved'|'needs_review';
  schemeType:string;
  maxMarks:number;
  guidanceMd?:string|null;
  points?:MarkSchemePoint[];
  groups?:MarkSchemeGroup[];
  levels?:MarkSchemeLevel[];
  sourceAudit?:SourceAudit|null;
};

type QuestionDetail = {
  id:string;
  displayRef:string;
  stemMd:string|null;
  contextMd:string|null;
  contentJson?:unknown;
  commandWord:string|null;
  marks:number;
  answerKind:string;
  markScheme?:MarkScheme|null;
};

type PortableQuestion = {
  leaf:{
    id:string;
    displayRef:string;
    stem:string;
    contentJson?:unknown;
    marks:number;
  };
  contextBlocks:Array<{
    id:string;
    displayRef:string;
    context:string|null;
    assets:PortableSourceAsset[];
  }>;
  dependencies:Array<{
    displayRef:string;
    stem:string|null;
    kind:string;
    strength:string;
    evidence:string|null;
  }>;
  sourceRef:string;
};

type RefResponse={detail:QuestionDetail;portable:PortableQuestion};

const cache=new Map<string,Promise<RefResponse>>();
let requestSerial=0;
let installed=false;
let scanScheduled=false;

function normalized(value:string){return value.replace(/\s+/g,' ').trim()}
function text(tag:string,className:string,value:string){
  const node=document.createElement(tag);
  node.className=className;
  node.textContent=value;
  return node;
}
function button(className:string,label:string){
  const node=document.createElement('button');
  node.type='button';
  node.className=className;
  node.textContent=label;
  return node;
}
function displayRef(card:Element){return normalized(card.querySelector('.lesson-exam-meta span')?.textContent??'')}
function year(card:Element){return normalized(card.closest('.lesson-exam-year-group')?.querySelector('.lesson-exam-year-header strong')?.textContent??'')}
function loCodes(card:Element){
  const value=card.querySelector('footer span:last-child')?.textContent??'';
  return [...new Set(value.match(/\b\d+(?:\.\d+)*-lo-\d+\b/g)??[])];
}
function syllabus(card:Element){
  const studio=card.closest('.lesson-studio');
  const level=normalized(studio?.querySelector('.lesson-toolbar-title span')?.textContent??'');
  return /IGCSE/i.test(level)?'0478':'9618';
}
function allCards(card:Element){return [...(card.closest('.lesson-studio')??document).querySelectorAll('.lesson-exam-card')]}

function load(ref:string){
  let pending=cache.get(ref);
  if(!pending){
    pending=api<RefResponse>(`/questions/by-ref?ref=${encodeURIComponent(ref)}`);
    cache.set(ref,pending);
  }
  return pending;
}

function ensureDialog(host:Element){
  const existing=host.querySelector<HTMLDialogElement>('.lesson-question-workspace-v3');
  if(existing)return existing;
  const dialog=document.createElement('dialog');
  dialog.className='lesson-question-workspace lesson-question-workspace-v3';
  dialog.addEventListener('click',(event)=>{if(event.target===dialog)dialog.close()});
  host.append(dialog);
  return dialog;
}

function workspaceHeader(ref:string,marks:number|string,position:string){
  const header=document.createElement('header');
  header.className='lesson-workspace-header';
  const identity=document.createElement('div');
  identity.append(text('span','lesson-workspace-position',position),text('h2','',ref));
  header.append(identity,text('span','lesson-workspace-marks',`${marks} mark${String(marks)==='1'?'':'s'}`));
  return header;
}

function allAssets(portable:PortableQuestion){
  return portable.contextBlocks.flatMap(block=>block.assets??[]);
}

function canonicalContent(response:RefResponse):StructuredQuestionContent|null{
  const candidate=response.detail.contentJson??response.portable.leaf.contentJson;
  return isStructuredQuestionContent(candidate)?candidate:null;
}

function renderCanonicalQuestion(response:RefResponse){
  const section=document.createElement('section');
  section.className='lesson-workspace-question lesson-v3-source-paper';
  const heading=document.createElement('div');
  heading.className='lesson-workspace-section-heading';
  heading.append(
    text('strong','','Source-faithful exam question'),
    text('span','','Canonical structured QP content · source page geometry retained'),
  );
  section.append(heading);

  const canonical=canonicalContent(response);
  if(!canonical){
    const blocked=text('div','lesson-v3-fidelity-error','Canonical structured question content is missing. A flattened fallback is intentionally not shown.');
    blocked.setAttribute('role','alert');
    section.append(blocked);
    return section;
  }

  const assets=allAssets(response.portable);
  const content=materializePortableSourceAssets(canonical,assets);
  const urls=portableAssetsForContent(assets);
  const unresolved=unresolvedVisualAsset(content,urls);
  if(unresolved){
    const blocked=text('div','lesson-v3-fidelity-error',`Original source visual could not be loaded: ${unresolved.altText||unresolved.kind}. The incomplete question is blocked.`);
    blocked.setAttribute('role','alert');
    section.append(blocked);
    return section;
  }

  const body=document.createElement('div');
  body.className='lesson-v3-canonical-question';
  body.append(renderStructuredQuestionContent(content,{resolveAsset:(id)=>urls[id]??null}));
  section.append(body);
  return section;
}

function renderContextAsset(asset:PortableSourceAsset){
  const figure=document.createElement('figure');
  figure.className='lesson-workspace-asset lesson-v3-context-asset';
  const url=portableAssetUrl(asset);
  if(url){
    const image=document.createElement('img');
    image.src=url;
    image.alt=asset.altText??'Question source asset';
    figure.append(image);
  }else if(asset.contentMd){
    const content=document.createElement('pre');
    content.className='lesson-v3-context-semantic';
    content.textContent=asset.contentMd;
    figure.append(content);
  }
  const caption=[asset.altText,asset.sourcePage?`Source page ${asset.sourcePage}`:''].filter(Boolean).join(' · ');
  if(caption)figure.append(text('figcaption','',caption));
  return figure;
}

function renderContext(portable:PortableQuestion){
  const useful=portable.contextBlocks.filter(block=>Boolean(block.context)||block.assets.length>0);
  if(!useful.length)return null;
  const section=document.createElement('section');
  section.className='lesson-workspace-contexts';
  const heading=document.createElement('div');
  heading.className='lesson-workspace-section-heading';
  heading.append(text('strong','','Required parent context'),text('span','','Text, tables and visuals travel with the selected leaf.'));
  section.append(heading);
  for(const block of useful){
    const article=document.createElement('article');
    article.append(text('strong','',block.displayRef));
    if(block.context){
      const context=text('p','lesson-v3-context-text',block.context);
      article.append(context);
    }
    block.assets.forEach(asset=>article.append(renderContextAsset(asset)));
    section.append(article);
  }
  return section;
}

function unknown(value:unknown){
  if(value===null||value===undefined)return '';
  if(Array.isArray(value))return value.map(item=>typeof item==='string'?item:JSON.stringify(item)).join(' · ');
  if(typeof value==='string')return value;
  if(typeof value==='object')return JSON.stringify(value);
  return String(value);
}

function auditReasons(audit:SourceAudit|null|undefined){
  if(!audit?.evidence||typeof audit.evidence!=='object'||Array.isArray(audit.evidence))return [] as string[];
  const reasons=(audit.evidence as Record<string,unknown>).reasons;
  if(!Array.isArray(reasons))return [] as string[];
  return reasons.map(reason=>{
    if(typeof reason==='string')return reason;
    if(reason&&typeof reason==='object'){
      const record=reason as Record<string,unknown>;
      return [record.code,record.detail].filter(Boolean).map(String).join(' · ');
    }
    return String(reason);
  });
}

function renderTrust(scheme:MarkScheme|null|undefined){
  const panel=document.createElement('section');
  panel.className=`lesson-v3-ms-trust ${scheme?.status==='approved'?'is-approved':scheme?'is-review':'is-missing'}`;
  const label=scheme?.status==='approved'?'APPROVED MARK SCHEME':scheme?'SOURCE REVIEW PENDING':'MARK SCHEME UNAVAILABLE';
  panel.append(text('span','lesson-v3-trust-label',label));
  if(!scheme){
    panel.append(text('p','','No mark-scheme record is currently linked to this approved question.'));
    return panel;
  }
  if(scheme.status==='approved'){
    panel.append(text('strong','','Reviewed scheme available'),text('p','','The lesson can reveal the stored reviewed mark points after students attempt the question.'));
  }else{
    panel.append(text('strong','','Extracted scheme — not promoted to approved'),text('p','','The source-backed extraction is visible to staff for review, but Lesson Studio does not label it as verified or official.'));
    const reasons=auditReasons(scheme.sourceAudit);
    if(scheme.sourceAudit||reasons.length){
      const details=document.createElement('details');
      const result=scheme.sourceAudit?.result?.replaceAll('_',' ')??'not audited';
      details.append(text('summary','',`Source audit: ${result}`));
      if(scheme.sourceAudit?.sourcePage)details.append(text('p','',`MS source page: ${scheme.sourceAudit.sourcePage}`));
      if(reasons.length){
        const list=document.createElement('ul');
        reasons.forEach(reason=>list.append(text('li','',reason)));
        details.append(list);
      }
      panel.append(details);
    }
  }
  return panel;
}

function renderScheme(scheme:MarkScheme|null|undefined){
  const section=document.createElement('section');
  section.className='lesson-workspace-scheme lesson-v3-mark-scheme';
  section.hidden=true;
  if(!scheme){
    section.append(text('p','','No mark scheme is available for this question.'));
    return section;
  }

  const heading=document.createElement('div');
  heading.className='lesson-workspace-section-heading';
  heading.append(
    text('strong','',scheme.status==='approved'?'Reviewed mark scheme':'Extracted mark scheme'),
    text('span','lesson-workspace-scheme-meta',`${scheme.schemeType.replaceAll('_',' ')} · ${scheme.maxMarks} marks`),
  );
  section.append(heading);

  if(scheme.guidanceMd)section.append(text('p','lesson-workspace-guidance',scheme.guidanceMd));

  if(scheme.groups?.length){
    const groups=document.createElement('div');
    groups.className='lesson-workspace-scheme-groups';
    for(const group of scheme.groups){
      const value=[group.label,group.nRequired?`${group.nRequired} required`:'',group.marksPerPoint?`${group.marksPerPoint} each`:'',group.maxMarks?`${group.maxMarks} max`:'' ].filter(Boolean).join(' · ');
      if(value)groups.append(text('span','',value));
    }
    section.append(groups);
  }

  if(scheme.levels?.length){
    const levels=document.createElement('section');
    levels.className='lesson-v3-levels';
    levels.append(text('strong','','Level descriptors'));
    for(const level of scheme.levels){
      const article=document.createElement('article');
      article.append(text('b','',`Level ${level.levelNumber} · ${level.minMarks}–${level.maxMarks} marks`));
      if(level.descriptorMd)article.append(text('p','',level.descriptorMd));
      if(level.indicativeContentMd)article.append(text('small','',`Indicative content: ${level.indicativeContentMd}`));
      levels.append(article);
    }
    section.append(levels);
  }

  const list=document.createElement('ol');
  list.className='lesson-workspace-mark-points';
  for(const point of scheme.points??[]){
    const item=document.createElement('li');
    const row=document.createElement('div');
    row.append(text('span','lesson-workspace-mp-code',point.code),text('span','lesson-workspace-mp-marks',`${point.marks} mark${point.marks===1?'':'s'}`));
    item.append(row,text('p','',point.text));
    const notes=[
      unknown(point.accept)?`Accept: ${unknown(point.accept)}`:'',
      unknown(point.reject)?`Reject: ${unknown(point.reject)}`:'',
      unknown(point.requires)?`Requires: ${unknown(point.requires)}`:'',
      point.isBod?'Benefit of doubt applies':'',
    ].filter(Boolean);
    if(notes.length)item.append(text('small','lesson-v3-mark-notes',notes.join(' · ')));
    list.append(item);
  }
  if(list.childElementCount)section.append(list);
  return section;
}

function renderDependencies(portable:PortableQuestion){
  if(!portable.dependencies.length)return null;
  const aside=document.createElement('aside');
  aside.className='lesson-workspace-dependencies';
  aside.append(text('strong','','Question dependency'));
  for(const dependency of portable.dependencies){
    aside.append(text('p','',[dependency.displayRef,dependency.kind,dependency.strength,dependency.evidence].filter(Boolean).join(' · ')));
  }
  return aside;
}

async function openCard(card:Element){
  const studio=card.closest('.lesson-studio')??document.body;
  const dialog=ensureDialog(studio);
  const cards=allCards(card);
  const index=Math.max(0,cards.indexOf(card));
  const ref=displayRef(card);
  const serial=++requestSerial;

  const loading=document.createElement('div');
  loading.className='lesson-workspace-loading';
  loading.append(workspaceHeader(ref,card.querySelector('.lesson-exam-meta b')?.textContent?.replace(/\D+/g,'')||'',`Question ${index+1} / ${cards.length}`));
  loading.append(text('p','','Canonical QP content, source context and mark scheme are loading…'));
  dialog.replaceChildren(loading);
  if(!dialog.open)dialog.showModal();

  try{
    const response=await load(ref);
    if(serial!==requestSerial)return;
    const shell=document.createElement('div');
    shell.className='lesson-workspace-shell lesson-v3-workspace-shell';
    shell.append(workspaceHeader(ref,response.detail.marks,`Question ${index+1} / ${cards.length}`));

    const close=button('lesson-workspace-close','Close');
    close.setAttribute('aria-label','Close question workspace');
    close.addEventListener('click',()=>dialog.close());
    shell.append(close);

    const toolbar=document.createElement('div');
    toolbar.className='lesson-workspace-toolbar';
    toolbar.append(
      text('span','lesson-workspace-source',`${syllabus(card)} · ${year(card)} · ${response.detail.commandWord??'Question'} · ${response.detail.answerKind}`),
      text('span','lesson-workspace-lo',loCodes(card).join(' · ')),
    );
    shell.append(toolbar);

    const body=document.createElement('div');
    body.className='lesson-workspace-body';
    const questionColumn=document.createElement('main');
    questionColumn.className='lesson-workspace-question-column';
    const context=renderContext(response.portable);
    if(context)questionColumn.append(context);
    questionColumn.append(renderCanonicalQuestion(response));

    const sideColumn=document.createElement('aside');
    sideColumn.className='lesson-workspace-side-column';
    sideColumn.append(renderTrust(response.detail.markScheme));
    const dependencies=renderDependencies(response.portable);
    if(dependencies)sideColumn.append(dependencies);
    const reveal=button('lesson-workspace-reveal','Mark schemeni ko‘rsatish');
    const scheme=renderScheme(response.detail.markScheme);
    reveal.addEventListener('click',()=>{
      scheme.hidden=!scheme.hidden;
      reveal.textContent=scheme.hidden?'Mark schemeni ko‘rsatish':'Mark schemeni yashirish';
    });
    sideColumn.append(reveal,scheme);
    body.append(questionColumn,sideColumn);
    shell.append(body);

    const navigation=document.createElement('nav');
    navigation.className='lesson-workspace-navigation';
    const previous=button('lesson-workspace-nav','← Previous question');
    const next=button('lesson-workspace-nav','Next question →');
    previous.disabled=index===0;
    next.disabled=index>=cards.length-1;
    previous.addEventListener('click',()=>{const target=cards[index-1];if(target)void openCard(target)});
    next.addEventListener('click',()=>{const target=cards[index+1];if(target)void openCard(target)});
    navigation.append(previous,next);
    shell.append(navigation);
    dialog.replaceChildren(shell);
  }catch(cause){
    if(serial!==requestSerial)return;
    const error=document.createElement('div');
    error.className='lesson-workspace-error';
    error.append(workspaceHeader(ref,'',`Question ${index+1} / ${cards.length}`));
    error.append(text('p','',cause instanceof Error?cause.message:'Question could not be opened.'));
    const close=button('lesson-workspace-close-error','Close');
    close.addEventListener('click',()=>dialog.close());
    error.append(close);
    dialog.replaceChildren(error);
  }
}

function enhanceCard(card:Element){
  const article=card as HTMLElement;
  if(article.dataset.examWorkspaceV3==='true')return;
  const legacy=article.querySelector<HTMLButtonElement>('.lesson-question-open');
  if(!legacy)return;
  article.dataset.examWorkspaceV3='true';
  const replacement=legacy.cloneNode(true) as HTMLButtonElement;
  replacement.textContent='Open full source question';
  replacement.title='Canonical question · required context · mark scheme';
  replacement.addEventListener('click',(event)=>{event.stopPropagation();void openCard(card)});
  legacy.replaceWith(replacement);
}

function scan(){document.querySelectorAll('.lesson-exam-card').forEach(enhanceCard)}
function schedule(){
  if(scanScheduled)return;
  scanScheduled=true;
  queueMicrotask(()=>{scanScheduled=false;scan()});
}

/**
 * Lesson-specific exam workspace. It deliberately resolves by exact Cambridge
 * display reference rather than re-querying a checkpoint with an implicit
 * syllabus default. That removes the 0478→9618 resolver bug and gives the
 * teacher one source-faithful QP/MS surface for all three audited chapters.
 */
export function installLessonExamWorkspaceV3(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

installLessonExamWorkspaceV3();