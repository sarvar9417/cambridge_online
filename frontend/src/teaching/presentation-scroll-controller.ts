function isInteractiveTarget(target:EventTarget|null){
  return target instanceof HTMLElement && Boolean(target.closest('button,input,textarea,select,a,[contenteditable="true"]'));
}

function currentStage(){
  return document.querySelector<HTMLElement>('.lesson-experience.lx-present .lx-present-stage');
}

/**
 * Presentation navigation uses the URL hash, so the same scroll container can
 * survive when React renders the next beat. Keep every new beat anchored at its
 * top and let PageUp/PageDown scroll a tall beat before they are allowed to
 * reach the presentation's own previous/next-slide keyboard handler.
 */
export function installPresentationScrollController(){
  let disposed=false;
  let stage:HTMLElement|null=null;

  const bind=()=>{
    stage=currentStage();
  };

  const resetAfterRender=()=>{
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(disposed)return;
      bind();
      stage?.scrollTo({top:0,left:0,behavior:'auto'});
    }));
  };

  const onKeyDown=(event:KeyboardEvent)=>{
    if(isInteractiveTarget(event.target))return;
    const active=currentStage();
    if(!active)return;
    stage=active;

    const tolerance=4;
    const canScrollDown=stage.scrollTop+stage.clientHeight<stage.scrollHeight-tolerance;
    const canScrollUp=stage.scrollTop>tolerance;
    if(event.key==='PageDown'&&canScrollDown){
      event.preventDefault();
      event.stopImmediatePropagation();
      stage.scrollBy({top:Math.max(240,stage.clientHeight*.82),behavior:'smooth'});
      return;
    }
    if(event.key==='PageUp'&&canScrollUp){
      event.preventDefault();
      event.stopImmediatePropagation();
      stage.scrollBy({top:-Math.max(240,stage.clientHeight*.82),behavior:'smooth'});
    }
  };

  const onResize=()=>bind();
  window.addEventListener('hashchange',resetAfterRender);
  window.addEventListener('resize',onResize);
  document.addEventListener('fullscreenchange',resetAfterRender);
  document.addEventListener('keydown',onKeyDown,true);
  resetAfterRender();

  return()=>{
    disposed=true;
    window.removeEventListener('hashchange',resetAfterRender);
    window.removeEventListener('resize',onResize);
    document.removeEventListener('fullscreenchange',resetAfterRender);
    document.removeEventListener('keydown',onKeyDown,true);
  };
}
