import { api } from './api';
import { isStructuredQuestionContent, type StructuredQuestionContent } from './structured-question-content';
import { renderStructuredQuestionContent } from './structured-question-renderer';

type PortableAsset = { id:string;url?:string|null };
type PortableQuestion = {
  leaf:{ contentJson?:unknown };
  contextBlocks:Array<{ assets:PortableAsset[] }>;
};
type RefResponse = {
  detail:{ contentJson?:unknown };
  portable:PortableQuestion;
};

const cache=new Map<string,Promise<RefResponse>>();

function normalizeRef(value:string){return value.replace(/\s+/g,' ').trim()}

function referenceFor(target:Element){
  if(target.matches('.qb-review-stem')){
    const footer=target.closest('.qb-review-question')?.querySelector('footer')?.textContent??'';
    return normalizeRef(footer.replace(/^\s*Manba:\s*/i,''));
  }
  if(target.matches('.qb-leaf-preview > p')){
    return normalizeRef(target.closest('.qb-portable-modal')?.querySelector('h2')?.textContent??'');
  }
  if(target.matches('.lesson-question-workspace .lesson-workspace-stem')){
    return normalizeRef(target.closest('.lesson-question-workspace')?.querySelector('.lesson-workspace-header h2')?.textContent??'');
  }
  return '';
}

function loadByRef(ref:string){
  let pending=cache.get(ref);
  if(!pending){
    pending=api<RefResponse>(`/questions/by-ref?ref=${encodeURIComponent(ref)}`);
    cache.set(ref,pending);
  }
  return pending;
}

function assetUrls(portable:PortableQuestion){
  const urls:Record<string,string>={};
  for(const block of portable.contextBlocks??[])for(const asset of block.assets??[]){
    if(asset.id&&asset.url)urls[asset.id]=asset.url;
  }
  return urls;
}

function canonicalContent(value:RefResponse):StructuredQuestionContent|null{
  const candidate=value.detail.contentJson??value.portable.leaf.contentJson;
  return isStructuredQuestionContent(candidate)?candidate:null;
}

function missingAsset(content:StructuredQuestionContent,urls:Record<string,string>){
  return content.blocks.find((block)=>block.type==='asset'&&!urls[block.assetId]);
}

function alertHost(message:string){
  const host=document.createElement('div');
  host.className='structured-question-invalid teacher-structured-question-error';
  host.setAttribute('role','alert');
  host.textContent=message;
  return host;
}

function renderCanonical(target:Element,content:StructuredQuestionContent,portable:PortableQuestion){
  const urls=assetUrls(portable);
  const missing=missingAsset(content,urls);
  const host=document.createElement('div');
  host.className='structured-question-view teacher-structured-question';
  host.dataset.contentVersion='1';
  if(missing){
    host.append(alertHost(`Original source visual yuklanmadi: ${missing.altText||missing.kind}. Noto‘liq savol ko‘rsatilmadi.`));
  }else{
    host.append(renderStructuredQuestionContent(content,{resolveAsset:(id)=>urls[id]??null}));
  }

  if(target.matches('.lesson-question-workspace .lesson-workspace-stem')){
    target.replaceChildren(host);
  }else{
    target.replaceWith(host);
  }
}

async function enhanceTarget(target:Element){
  if((target as HTMLElement).dataset.structuredCanonicalState)return;
  const ref=referenceFor(target);
  if(!ref)return;
  (target as HTMLElement).dataset.structuredCanonicalState='loading';
  try{
    const response=await loadByRef(ref);
    if(!target.isConnected)return;
    const content=canonicalContent(response);
    if(!content){
      target.replaceWith(alertHost('Source-backed canonical savol topilmadi. Flattened matn bilan ishlash bloklandi.'));
      return;
    }

    // Choice/word-bank Lesson Studio controls are derived from the printed text.
    // Their prompt stays intact unless canonical content contains a genuinely
    // structured block. Generic Lesson Studio questions always render canonically.
    if(target.matches('.lesson-question-workspace .lesson-workspace-stem')){
      const section=target.closest('.lesson-workspace-question');
      const generic=Boolean(section?.querySelector('.lesson-workspace-response'));
      const rich=content.blocks.some((block)=>!['text','list','answer_area'].includes(block.type));
      if(!generic&&!rich){
        (target as HTMLElement).dataset.structuredCanonicalState='verified-text-equivalent';
        return;
      }
    }
    renderCanonical(target,content,response.portable);
  }catch{
    if(!target.isConnected)return;
    target.replaceWith(alertHost('Canonical savol yuklanmadi. Noto‘liq yoki eski flattened ko‘rinish ko‘rsatilmadi.'));
  }
}

function scan(root:ParentNode=document){
  const selector='.qb-leaf-preview > p,.qb-review-stem,.lesson-question-workspace .lesson-workspace-stem';
  if(root instanceof Element&&root.matches(selector))void enhanceTarget(root);
  root.querySelectorAll?.(selector).forEach((target)=>void enhanceTarget(target));
}

/**
 * Canonical teacher rendering layer shared by Question Bank and Lesson Studio.
 * It runs after the legacy text enhancer and replaces the final display with
 * source-backed structured JSON whenever the question is rendered as a full
 * exam item. Missing canonical data/assets fail closed instead of silently
 * falling back to flattened text.
 */
export function installTeacherStructuredQuestionEnhancer(){
  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;scan()});
  };
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
}
