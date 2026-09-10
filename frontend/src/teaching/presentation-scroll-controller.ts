function isInteractiveTarget(target:EventTarget|null){
  return target instanceof HTMLElement && Boolean(target.closest('button,input,textarea,select,a,[contenteditable="true"]'));
}

function currentStage(){
  return document.querySelector<HTMLElement>('.lesson-experience.lx-present .lx-present-stage');
}

/**
 * Scroll safety only. Navigation belongs exclusively to LessonExperience React
 * handlers so Oldingi/Keyingi and ArrowLeft/ArrowRight can never be swallowed
 * by a DOM capture listener. PageUp/PageDown remain available for an unusually
 * tall projector scene; each new beat starts at the top.
 */
export function installPresentationScrollController(){
  let disposed=false;
  const resetAfterRender=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(disposed)return;
    currentStage()?.scrollTo({top:0,left:0,behavior:'auto'});
  }));
  const onKeyDown=(event:KeyboardEvent)=>{
    if(isInteractiveTarget(event.target))return;
    if(event.key!=='PageDown'&&event.key!=='PageUp')return;
    const stage=currentStage();
    if(!stage)return;
    const direction=event.key==='PageDown'?1:-1;
    const canScroll=direction===1
      ? stage.scrollTop+stage.clientHeight<stage.scrollHeight-4
      : stage.scrollTop>4;
    if(!canScroll)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    stage.scrollBy({top:direction*Math.max(240,stage.clientHeight*.82),behavior:'smooth'});
  };
  window.addEventListener('hashchange',resetAfterRender);
  document.addEventListener('fullscreenchange',resetAfterRender);
  document.addEventListener('keydown',onKeyDown,true);
  resetAfterRender();
  return()=>{
    disposed=true;
    window.removeEventListener('hashchange',resetAfterRender);
    document.removeEventListener('fullscreenchange',resetAfterRender);
    document.removeEventListener('keydown',onKeyDown,true);
  };
}
