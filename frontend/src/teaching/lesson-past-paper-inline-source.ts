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

function assetComplete(asset:ExamAsset){
  return Boolean(asset.url||asset.contentMd);
}

function isVisualAsset(asset:ExamAsset){
  const kind=asset.kind.toLowerCase();
  return kind==='diagram'||kind==='image';
}

function questionComplete(question:ExamQuestion){
  const contextAssets=question.contextBlocks.flatMap(block=>block.assets);
  const dependencyAssets=question.dependencies.flatMap(dependency=>dependency.assets);
  const allAssets=[...contextAssets,...dependencyAssets];
  if(question.hasDiagram&&!allAssets.some(asset=>isVisualAsset(asset)&&assetComplete(asset)))return false;
  if(question.hasDependency&&!question.dependencies.length)return false;
  return allAssets.every(asset=>assetComplete(asset));
}

function contractLoCodes(card:HTMLElement){
  const contract=card.closest('.lesson-studio')?.querySelector('.lesson-checkpoint-contract strong')?.textContent??'';
  return contract
    .split('·')
    .map(value=>value.trim())
    .filter(value=>value.length>0&&value.length<=40&&/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value));
}

function queryForCard(card:HTMLElement){
  const cardCodes=(card.dataset.loCodes??'').split('|').map(value=>value.trim()).filter(Boolean);
  const loCodes=[...new Set([...contractLoCodes(card),...cardCodes])];
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

function markIncomplete(card:HTMLElement){
  card.dataset.pastPaperSourceReady='false';
  card.classList.add('lesson-past-paper-source-incomplete');
}

async function enhanceCard(card:HTMLElement){
  if(card.querySelector(':scope > .lesson-past-paper-source'))return;
  if(card.dataset.pastPaperSourceLoading==='true')return;
  card.dataset.pastPaperSourceLoading='true';
  try{
    const question=await loadQuestion(card);
    if(!question||!questionComplete(question)){
      markIncomplete(card);
      return;
    }
    if(!card.isConnected||card.querySelector(':scope > .lesson-past-paper-source'))return;
    card.querySelector(':scope > .lesson-question-context')?.remove();
    card.querySelector(':scope > p')?.remove();
    const source=renderCompleteQuestion(question);
    const meta=card.querySelector(':scope > .lesson-exam-meta');
    meta?.insertAdjacentElement('afterend',source);
    card.dataset.pastPaperSourceReady='true';
    card.classList.remove('lesson-past-paper-source-incomplete');
  }catch{
    markIncomplete(card);
  }finally{
    delete card.dataset.pastPaperSourceLoading;
  }
}

function enhance(root:ParentNode=document){
  root.querySelectorAll<HTMLElement>('.lesson-topic-past-paper-block .lesson-exam-card').forEach(card=>void enhanceCard(card));
}

/**
 * Replace compact Lesson Studio checkpoint previews with the complete source
 * context required to read each Cambridge question inline. If required source
 * context cannot be reconstructed, the partial preview is suppressed rather
 * than presented as a complete question.
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
