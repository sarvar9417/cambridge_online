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
import './lesson-exam-inline.css';

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
const hydrating=new WeakSet<Element>();
let installed=false;
let scanScheduled=false;
let visibilityObserver:IntersectionObserver|null=null;

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

function load(ref:string){
  let pending=cache.get(ref);
  if(!pending){
    pending=api<RefResponse>(`/questions/by-ref?ref=${encodeURIComponent(ref)}`);
    cache.set(ref,pending);
  }
  return pending;
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
  section.className='lesson-inline-source-paper';

  const canonical=canonicalContent(response);
  if(!canonical){
    const blocked=text('div','lesson-v3-fidelity-error','Canonical structured question content is missing. The incomplete question is intentionally blocked.');
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
  body.className='lesson-v3-canonical-question lesson-inline-canonical-question';
  body.append(renderStructuredQuestionContent(content,{resolveAsset:(id)=>urls[id]??null}));
  section.append(body);
  return section;
}

function renderContextAsset(asset:PortableSourceAsset){
  const figure=document.createElement('figure');
  figure.className='lesson-workspace-asset lesson-v3-context-asset lesson-inline-context-asset';
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
  section.className='lesson-inline-context';
  const label=text('span','lesson-inline-context-label','REQUIRED CONTEXT');
  section.append(label);
  for(const block of useful){
    const article=document.createElement('article');
    article.append(text('strong','',block.displayRef));
    if(block.context)article.append(text('p','lesson-v3-context-text',block.context));
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

function trustLabel(scheme:MarkScheme|null|undefined){
  if(scheme?.status==='approved')return 'MS approved';
  if(scheme)return 'MS review pending';
  return 'MS unavailable';
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
    panel.append(text('strong','','Reviewed scheme available'));
  }else{
    panel.append(text('strong','','Extracted scheme — not promoted to approved'));
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
  section.className='lesson-workspace-scheme lesson-v3-mark-scheme lesson-inline-mark-scheme';
  section.hidden=true;
  section.append(renderTrust(scheme));
  if(!scheme)return section;

  const heading=document.createElement('div');
  heading.className='lesson-workspace-section-heading';
  heading.append(
    text('strong','',scheme.status==='approved'?'Mark scheme':'Extracted mark scheme'),
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
  const details=document.createElement('details');
  details.className='lesson-inline-dependencies';
  details.append(text('summary','',`Dependency context · ${portable.dependencies.length}`));
  for(const dependency of portable.dependencies){
    details.append(text('p','',[dependency.displayRef,dependency.kind,dependency.strength,dependency.evidence].filter(Boolean).join(' · ')));
  }
  return details;
}

function collapseOtherSchemes(card:Element){
  const studio=card.closest('.lesson-studio')??document;
  studio.querySelectorAll<HTMLElement>('.lesson-exam-card.is-ms-open').forEach(other=>{
    if(other===card)return;
    other.classList.remove('is-ms-open');
    const scheme=other.querySelector<HTMLElement>('.lesson-inline-mark-scheme');
    const toggle=other.querySelector<HTMLButtonElement>('.lesson-inline-ms-toggle');
    if(scheme)scheme.hidden=true;
    if(toggle){toggle.textContent='Mark scheme';toggle.setAttribute('aria-expanded','false');}
  });
}

function renderToolbar(card:Element,response:RefResponse,scheme:HTMLElement){
  const toolbar=document.createElement('div');
  toolbar.className='lesson-inline-toolbar';
  const meta=document.createElement('div');
  meta.className='lesson-inline-source-meta';
  meta.append(
    text('span','',`${syllabus(card)} · ${year(card)}`),
    text('span','',response.detail.commandWord??'Question'),
  );
  const codes=loCodes(card);
  if(codes.length)meta.append(text('span','',codes.join(' · ')));

  const actions=document.createElement('div');
  actions.className='lesson-inline-toolbar-actions';
  const trust=text('span',`lesson-inline-ms-status ${response.detail.markScheme?.status==='approved'?'is-approved':response.detail.markScheme?'is-review':'is-missing'}`,trustLabel(response.detail.markScheme));
  const reveal=button('lesson-inline-ms-toggle','Mark scheme');
  const schemeId=`lesson-ms-${response.detail.id}`;
  scheme.id=schemeId;
  reveal.setAttribute('aria-controls',schemeId);
  reveal.setAttribute('aria-expanded','false');
  reveal.addEventListener('click',(event)=>{
    event.stopPropagation();
    const opening=scheme.hidden;
    if(opening)collapseOtherSchemes(card);
    scheme.hidden=!opening;
    card.classList.toggle('is-ms-open',opening);
    reveal.textContent=opening?'Mark schemeni yashirish':'Mark scheme';
    reveal.setAttribute('aria-expanded',String(opening));
  });
  actions.append(trust,reveal);
  toolbar.append(meta,actions);
  return toolbar;
}

function loadingState(){
  const loading=document.createElement('div');
  loading.className='lesson-inline-loading';
  loading.setAttribute('aria-label','Full source question loading');
  loading.append(text('span','lesson-inline-loading-line',''),text('span','lesson-inline-loading-line is-wide',''),text('span','lesson-inline-loading-line',''));
  return loading;
}

function errorState(card:Element,cause:unknown){
  const wrapper=document.createElement('div');
  wrapper.className='lesson-inline-error';
  wrapper.append(text('strong','','Savolning source-faithful ko‘rinishi yuklanmadi.'),text('p','',cause instanceof Error?cause.message:'Question could not be loaded.'));
  const retry=button('lesson-inline-retry','Qayta urinish');
  retry.addEventListener('click',()=>{
    cache.delete(displayRef(card));
    void hydrateCard(card,true);
  });
  wrapper.append(retry);
  return wrapper;
}

function renderInlineQuestion(card:Element,response:RefResponse){
  const shell=document.createElement('div');
  shell.className='lesson-inline-question-shell';
  const scheme=renderScheme(response.detail.markScheme);
  shell.append(renderToolbar(card,response,scheme));
  const context=renderContext(response.portable);
  if(context)shell.append(context);
  shell.append(renderCanonicalQuestion(response));
  const dependencies=renderDependencies(response.portable);
  if(dependencies)shell.append(dependencies);
  shell.append(scheme);
  return shell;
}

async function hydrateCard(card:Element,force=false){
  const article=card as HTMLElement;
  const mount=article.querySelector<HTMLElement>('.lesson-inline-question');
  if(!mount||hydrating.has(card))return;
  if(article.dataset.inlineSourceReady==='true'&&!force)return;
  const ref=displayRef(card);
  if(!ref){
    mount.replaceChildren(errorState(card,new Error('Savol manbasi aniqlanmadi.')));
    return;
  }
  hydrating.add(card);
  article.dataset.inlineSourceReady='loading';
  mount.replaceChildren(loadingState());
  try{
    const response=await load(ref);
    if(!article.isConnected)return;
    mount.replaceChildren(renderInlineQuestion(card,response));
    article.dataset.inlineSourceReady='true';
  }catch(cause){
    if(article.isConnected){
      mount.replaceChildren(errorState(card,cause));
      article.dataset.inlineSourceReady='error';
    }
  }finally{
    hydrating.delete(card);
  }
}

function getVisibilityObserver(){
  if(visibilityObserver||typeof IntersectionObserver==='undefined')return visibilityObserver;
  visibilityObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      visibilityObserver?.unobserve(entry.target);
      void hydrateCard(entry.target);
    }
  },{rootMargin:'700px 0px'});
  return visibilityObserver;
}

function enhanceCard(card:Element){
  const article=card as HTMLElement;
  if(article.dataset.examWorkspaceV3==='true')return;
  article.dataset.examWorkspaceV3='true';
  article.dataset.questionWorkspaceReady='true';
  article.classList.add('lesson-exam-inline');
  article.querySelector('.lesson-question-card-actions')?.remove();

  const mount=document.createElement('section');
  mount.className='lesson-inline-question';
  mount.append(loadingState());
  article.append(mount);

  const observer=getVisibilityObserver();
  if(observer)observer.observe(article);
  else void hydrateCard(article);
}

function scan(){document.querySelectorAll('.lesson-exam-card').forEach(enhanceCard)}
function schedule(){
  if(scanScheduled)return;
  scanScheduled=true;
  queueMicrotask(()=>{scanScheduled=false;scan()});
}

/**
 * Lesson Studio past-paper flow is intentionally inline: the complete canonical
 * question is visible in the lesson card and the teacher needs only one action
 * to reveal/hide the mark scheme. No modal, answer-entry workspace or second
 * navigation layer is introduced during classroom teaching.
 */
export function installLessonExamWorkspaceV3(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

installLessonExamWorkspaceV3();