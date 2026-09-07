import { bookCompletenessAudit } from './book-completeness-audit';

let scheduled=false;
let teardown:VoidFunction|null=null;
let consumers=0;

function chapterNumber(studio:Element){
  const value=studio.querySelector('.lesson-toolbar-title span')?.textContent??'';
  return Number(value.match(/Chapter\s+(\d+)/i)?.[1]??0);
}

function originalDots(studio:Element){
  const nav=studio.querySelector('.lesson-nav');
  if(!nav)return [] as HTMLButtonElement[];
  return [...nav.querySelectorAll<HTMLButtonElement>(':scope > div:not(.lesson-v3-nav-center) > button')];
}

function activeSlide(studio:Element,dots:HTMLButtonElement[]){
  const index=dots.findIndex(dot=>dot.classList.contains('active'));
  return index>=0?index:0;
}

function activeSection(studio:Element){
  const value=studio.querySelector('.lesson-outline button.active')?.textContent??'';
  return value.replace(/^\s*\d+\s*/,'').trim();
}

function ensureSourceBadge(studio:HTMLElement){
  const actions=studio.querySelector('.lesson-toolbar-actions');
  if(!actions)return;
  const chapter=chapterNumber(studio);
  const audit=bookCompletenessAudit(chapter);
  if(!audit)return;
  let badge=actions.querySelector<HTMLElement>('.lesson-source-complete-badge');
  if(!badge){
    badge=document.createElement('span');
    badge.className='lesson-source-complete-badge';
    actions.insertBefore(badge,actions.firstChild);
  }
  const text=audit.complete
    ? `${audit.checksCovered}/${audit.checksExpected} book completeness checks`
    : `Book audit ${audit.checksCovered}/${audit.checksExpected}`;
  if(badge.textContent!==text)badge.textContent=text;
  badge.dataset.complete=String(audit.complete);
  const missing=Object.entries(audit.categories)
    .filter(([,result])=>!result.complete)
    .map(([category,result])=>`${category}: ${result.missing.join('; ')}`);
  const title=audit.complete
    ? 'Source Complete: exact supplied-PDF pages, objectives/prior knowledge, key terms, semantic emphasis, examples, activities, extensions, figures, tables, sidebars/links, pseudocode, chapter review and Cambridge checkpoints all pass the formal book audit.'
    : `Source Complete is blocked. Missing book evidence: ${missing.join(' | ')}`;
  if(badge.title!==title)badge.title=title;
}

function ensureCompactNavigation(studio:HTMLElement){
  const nav=studio.querySelector<HTMLElement>('.lesson-nav');
  if(!nav)return;
  const dots=originalDots(studio);
  if(!dots.length)return;
  const index=activeSlide(studio,dots);

  let center=nav.querySelector<HTMLElement>('.lesson-v3-nav-center');
  let range=center?.querySelector<HTMLInputElement>('.lesson-v3-nav-range')??null;
  let label=center?.querySelector<HTMLElement>('.lesson-v3-nav-label')??null;
  if(!center){
    center=document.createElement('div');
    center.className='lesson-v3-nav-center';
    range=document.createElement('input');
    range.className='lesson-v3-nav-range';
    range.type='range';
    range.min='1';
    range.step='1';
    range.setAttribute('aria-label','Lesson slide');
    label=document.createElement('span');
    label.className='lesson-v3-nav-label';
    const hint=document.createElement('span');
    hint.className='lesson-v3-nav-hint';
    hint.textContent='Arrow keys / Page Up / Page Down · drag to jump';
    center.append(range,label,hint);
    const next=nav.querySelector(':scope > button:last-child');
    if(next)nav.insertBefore(center,next);else nav.append(center);
    range.addEventListener('input',()=>{
      const current=originalDots(studio);
      const target=current[Math.max(0,Number(range!.value)-1)];
      target?.click();
    });
  }

  if(!range||!label)return;
  const max=String(dots.length),value=String(index+1);
  if(range.max!==max)range.max=max;
  if(range.value!==value)range.value=value;
  const section=activeSection(studio);
  const text=`${index+1} / ${dots.length}${section?` · ${section}`:''}`;
  if(label.textContent!==text)label.textContent=text;
  if(range.getAttribute('aria-valuetext')!==text)range.setAttribute('aria-valuetext',text);
}

function enrichOutline(studio:HTMLElement){
  const buttons=[...studio.querySelectorAll<HTMLButtonElement>('.lesson-outline button')];
  buttons.forEach((button,index)=>{
    if(button.dataset.boardHintReady==='true')return;
    button.dataset.boardHintReady='true';
    button.title=`Jump to section ${index+1}: ${button.textContent?.replace(/^\s*\d+\s*/,'').trim()??''}`;
  });
}

function updateFullscreenState(){
  const presenting=Boolean(document.fullscreenElement?.classList.contains('lesson-studio'));
  document.documentElement.classList.toggle('lesson-presenting',presenting);
}

function enhance(studio:HTMLElement){
  ensureSourceBadge(studio);
  ensureCompactNavigation(studio);
  enrichOutline(studio);
}

function scan(){document.querySelectorAll<HTMLElement>('.lesson-studio').forEach(enhance)}
function schedule(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{
    scheduled=false;
    if(teardown)scan();
  });
}

function setup(){
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  const fullscreen=()=>{updateFullscreenState();schedule()};
  document.addEventListener('fullscreenchange',fullscreen);
  updateFullscreenState();

  teardown=()=>{
    observer.disconnect();
    document.removeEventListener('fullscreenchange',fullscreen);
    document.documentElement.classList.remove('lesson-presenting');
    scheduled=false;
    teardown=null;
  };
}

/**
 * Keep teacher navigation compact even when source-complete lessons contain
 * dozens of slides. Installation is tied to the React Lesson Studio lifecycle
 * rather than module import, so tests/HMR/unmounts do not leave global observers.
 */
export function installLessonStudioProfessionalControls(){
  if(typeof document==='undefined')return()=>{};
  consumers+=1;
  if(!teardown)setup();
  let released=false;
  return()=>{
    if(released)return;
    released=true;
    consumers=Math.max(0,consumers-1);
    if(consumers===0)teardown?.();
  };
}
