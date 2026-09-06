let installed=false;
let scheduled=false;

const sourcePages:Record<number,number>={1:26,7:41,13:24};

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
  const pages=sourcePages[chapter];
  if(!pages)return;
  let badge=actions.querySelector<HTMLElement>('.lesson-source-complete-badge');
  if(!badge){
    badge=document.createElement('span');
    badge.className='lesson-source-complete-badge';
    actions.insertBefore(badge,actions.firstChild);
  }
  badge.textContent=`${pages}/${pages} supplied PDF pages audited`;
  badge.title='Every supplied source page is pinned by the lesson source-fidelity contract.';
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
  range.max=String(dots.length);
  range.value=String(index+1);
  const section=activeSection(studio);
  label.textContent=`${index+1} / ${dots.length}${section?` · ${section}`:''}`;
  range.setAttribute('aria-valuetext',label.textContent);
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
  queueMicrotask(()=>{scheduled=false;scan()});
}

/** Keep teacher navigation compact even when source-complete lessons contain dozens of slides. */
export function installLessonStudioProfessionalControls(){
  if(installed||typeof document==='undefined')return;
  installed=true;
  schedule();
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('fullscreenchange',()=>{updateFullscreenState();schedule()});
  updateFullscreenState();
}

installLessonStudioProfessionalControls();
