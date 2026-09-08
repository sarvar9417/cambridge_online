import { api } from '../lib/api';

type ExamAsset = {
  id:string;
  kind:string;
  url:string|null;
  contentMd:string|null;
  altText:string;
  sourcePage:number|null;
};

type ExamContextBlock = {
  id:string;
  displayRef:string;
  contextMd:string|null;
  assets:ExamAsset[];
};

type ExamDependency = {
  id:string;
  displayRef:string;
  stem:string;
  contextMd:string|null;
  assets:ExamAsset[];
};

type ExamQuestion = {
  id:string;
  displayRef:string;
  stem:string;
  contextMd:string|null;
  marks:number;
  hasDiagram:boolean;
  hasDependency:boolean;
  contextBlocks:ExamContextBlock[];
  dependencies:ExamDependency[];
};

type CheckpointResponse={data:ExamQuestion[]};

const responseCache=new Map<string,Promise<CheckpointResponse>>();

function normalized(value:string|null|undefined){
  return (value??'').replace(/\s+/g,' ').trim();
}

function sourceAssetValue(asset:ExamAsset){
  if(asset.url)return `[[browser_asset_url:${encodeURIComponent(asset.url)}]]`;
  return asset.contentMd??'';
}

function renderAsset(asset:ExamAsset){
  const value=sourceAssetValue(asset);
  if(!value)return null;
  const figure=document.createElement('figure');
  figure.className='qb-asset lesson-past-paper-inline-asset';
  const kind=document.createElement('strong');
  kind.textContent=asset.kind;
  const label=document.createElement('span');
  label.textContent=[asset.altText,asset.sourcePage?`Source page ${asset.sourcePage}`:''].filter(Boolean).join(' · ');
  const source=document.createElement('pre');
  source.textContent=value;
  figure.append(kind,label,source);
  return figure;
}

function paragraph(className:string,text:string|null|undefined){
  if(!text)return null;
  const node=document.createElement('p');
  node.className=className;
  node.textContent=text;
  return node;
}

function assetsComplete(assets:ExamAsset[]){
  return assets.every(asset=>Boolean(asset.url||asset.contentMd));
}

function questionComplete(question:ExamQuestion){
  const contextAssets=question.contextBlocks.flatMap(block=>block.assets);
  const dependencyAssets=question.dependencies.flatMap(dependency=>dependency.assets);
  const allAssets=[...contextAssets,...dependencyAssets];
  if(question.hasDiagram&&!allAssets.some(asset=>Boolean(asset.url||asset.contentMd)))return false;
  if(question.hasDependency&&!question.dependencies.length)return false;
  return assetsComplete(allAssets);
}

function queryForCard(card:HTMLElement){
  const loCodes=(card.dataset.loCodes??'').split('|').map(value=>value.trim()).filter(Boolean);
  if(!loCodes.length)return null;
  const yearText=card.closest('.lesson-exam-year-group')?.querySelector('.lesson-exam-year-header strong')?.textContent??'';
  const year=Number(yearText);
  const params=new URLSearchParams({
    yearFrom:String(Number.isInteger(year)&&year>0?year:2021),
    yearTo:String(Number.isInteger(year)&&year>0?year:2026),
    syllabusCode:card.dataset.syllabusCode||'9618',
  });
  loCodes.forEach(code=>params.append('loCodes',code));
  return params;
}

async function loadQuestion(card:HTMLElement){
  const params=queryForCard(card);
  if(!params)return null;
  const key=params.toString();
  let pending=responseCache.get(key);
  if(!pending){
    pending=api<CheckpointResponse>(`/lesson-checkpoints?${params}`);
    responseCache.set(key,pending);
  }
  const response=await pending;
  const ref=normalized(card.querySelector('.lesson-exam-meta > span')?.textContent);
  return response.data.find(question=>normalized(question.displayRef)===ref)??null;
}

function renderDependency(dependency:ExamDependency){
  const section=document.createElement('section');
  section.className='lesson-past-paper-required-context';
  const ref=document.createElement('strong');
  ref.textContent=dependency.displayRef;
  section.append(ref);
  const context=paragraph('lesson-past-paper-context',dependency.contextMd);
  if(context)section.append(context);
  dependency.assets.forEach(asset=>{const node=renderAsset(asset);if(node)section.append(node);});
  const stem=paragraph('lesson-past-paper-context',dependency.stem);
  if(stem)section.append(stem);
  return section;
}

function renderCompleteQuestion(question:ExamQuestion){
  const source=document.createElement('div');
  source.className='lesson-past-paper-source';
  question.dependencies.forEach(dependency=>source.append(renderDependency(dependency)));
  question.contextBlocks.forEach(block=>{
    const section=document.createElement('section');
    section.className='lesson-past-paper-context-block';
    const context=paragraph('lesson-past-paper-context',block.contextMd);
    if(context)section.append(context);
    block.assets.forEach(asset=>{const node=renderAsset(asset);if(node)section.append(node);});
    if(section.childNodes.length)source.append(section);
  });
  if(!question.contextBlocks.length){
    const context=paragraph('lesson-past-paper-context',question.contextMd);
    if(context)source.append(context);
  }
  const stem=paragraph('lesson-past-paper-stem',question.stem);
  if(stem)source.append(stem);
  return source;
}

async function enhanceCard(card:HTMLElement){
  if(card.querySelector(':scope > .lesson-past-paper-source'))return;
  if(card.dataset.pastPaperSourceLoading==='true')return;
  card.dataset.pastPaperSourceLoading='true';
  try{
    const question=await loadQuestion(card);
    if(!question||!questionComplete(question))return;
    if(!card.isConnected||card.querySelector(':scope > .lesson-past-paper-source'))return;
    card.querySelector(':scope > .lesson-question-context')?.remove();
    card.querySelector(':scope > p')?.remove();
    const source=renderCompleteQuestion(question);
    const meta=card.querySelector(':scope > .lesson-exam-meta');
    meta?.insertAdjacentElement('afterend',source);
  }catch{
    // Keep the original source text when the full source request is unavailable.
  }finally{
    delete card.dataset.pastPaperSourceLoading;
  }
}

function enhance(root:ParentNode=document){
  root.querySelectorAll<HTMLElement>('.lesson-topic-past-paper-block .lesson-exam-card').forEach(card=>void enhanceCard(card));
}

/**
 * Replace the compact Lesson Studio checkpoint preview with the complete
 * source-backed context required to read the question inline. This is display
 * only: no mark scheme, answer state, LO metadata or question actions are added.
 */
export function installLessonPastPaperInlineSource(){
  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;enhance();});
  };
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
}
