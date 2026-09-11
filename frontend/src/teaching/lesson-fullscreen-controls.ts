import './lesson-fullscreen-controls.css';

const ROOT_SELECTOR='.lesson-experience';
const BUTTON_CLASS='lesson-fullscreen-toggle';
const ENABLED_CLASS='lesson-fullscreen-controls-enabled';

function fullscreenSupported(root:HTMLElement){
  return Boolean(document.fullscreenEnabled&&root.requestFullscreen);
}

export function installLessonFullscreenControls(){
  let root:HTMLElement|null=null;
  let button:HTMLButtonElement|null=null;
  let disposed=false;

  const updateButton=()=>{
    if(!button||!root)return;
    const active=document.fullscreenElement===root;
    const labelText=active?'Exit full screen':'Full screen';
    const iconText=active?'↙':'⛶';
    if(button.getAttribute('aria-pressed')!==String(active))button.setAttribute('aria-pressed',String(active));
    if(button.getAttribute('aria-label')!==labelText)button.setAttribute('aria-label',labelText);
    if(button.title!==labelText)button.title=labelText;
    const label=button.querySelector<HTMLElement>('.lesson-fullscreen-label');
    const icon=button.querySelector<HTMLElement>('.lesson-fullscreen-icon');
    if(label&&label.textContent!==labelText)label.textContent=labelText;
    if(icon&&icon.textContent!==iconText)icon.textContent=iconText;
  };

  const toggleFullscreen=async()=>{
    const target=root;
    if(!target||!fullscreenSupported(target))return;
    try{
      if(document.fullscreenElement===target){
        await document.exitFullscreen();
        return;
      }
      if(document.fullscreenElement)await document.exitFullscreen();
      await target.requestFullscreen();
    }catch{/* Fullscreen can be denied by browser policy; keep the lesson usable. */}
  };

  const ensureButton=()=>{
    if(disposed)return;
    const nextRoot=document.querySelector<HTMLElement>(ROOT_SELECTOR);
    if(root!==nextRoot){
      root?.classList.remove(ENABLED_CLASS);
      button?.removeEventListener('click',toggleFullscreen);
      button?.remove();
      button=null;
      root=nextRoot;
    }
    if(!root)return;
    root.classList.add(ENABLED_CLASS);
    const existing=root.querySelector<HTMLButtonElement>(`:scope > .${BUTTON_CLASS}`);
    if(existing){
      button=existing;
      updateButton();
      return;
    }
    button=document.createElement('button');
    button.type='button';
    button.className=BUTTON_CLASS;
    button.hidden=!fullscreenSupported(root);
    button.innerHTML='<span class="lesson-fullscreen-icon" aria-hidden="true">⛶</span><span class="lesson-fullscreen-label">Full screen</span>';
    button.addEventListener('click',toggleFullscreen);
    root.append(button);
    updateButton();
  };

  const onFullscreenChange=()=>{
    ensureButton();
    updateButton();
  };
  const onKeyDown=(event:KeyboardEvent)=>{
    if(event.key!=='Escape'||!root||document.fullscreenElement!==root)return;
    // Let the browser perform its native Escape-to-exit-fullscreen action, but
    // stop Presentation mode from interpreting the same key as "leave lesson".
    event.stopImmediatePropagation();
  };

  const observer=new MutationObserver(()=>{
    if(disposed)return;
    // Lesson content can mutate frequently (answers, reveal steps, filters). Do
    // not re-run the fullscreen installer for those mutations. We only need to
    // recover when React replaced the LessonExperience root or our button.
    if(root?.isConnected&&button?.isConnected)return;
    ensureButton();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('fullscreenchange',onFullscreenChange);
  window.addEventListener('keydown',onKeyDown,true);
  ensureButton();

  return()=>{
    disposed=true;
    observer.disconnect();
    document.removeEventListener('fullscreenchange',onFullscreenChange);
    window.removeEventListener('keydown',onKeyDown,true);
    button?.removeEventListener('click',toggleFullscreen);
    button?.remove();
    root?.classList.remove(ENABLED_CLASS);
    button=null;
    root=null;
  };
}
