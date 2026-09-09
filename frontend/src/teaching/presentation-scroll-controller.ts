function isInteractiveTarget(target:EventTarget|null){
  return target instanceof HTMLElement && Boolean(target.closest('button,input,textarea,select,a,[contenteditable="true"]'));
}

function currentStage(){
  return document.querySelector<HTMLElement>('.lesson-experience.lx-present .lx-present-stage');
}

function revealIsComplete(){
  return document.querySelector('.lesson-experience.lx-present .lx-present-nav p')?.textContent?.includes('keyingi ekran')??false;
}

/**
 * Presentation navigation uses the URL hash, so the same scroll container can
 * survive when React renders the next beat. Keep every new beat anchored at its
 * top and let PageUp/PageDown scroll a tall beat before they are allowed to
 * reach the presentation's own previous/next-slide keyboard handler.
 *
 * Space still reveals progressive content first. Once the reveal is complete,
 * a tall scene is scrolled before Space can advance to the next beat so the
 * teacher cannot accidentally skip content that sits below the fold.
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

  const scrollByPage=(direction:1|-1)=>{
    if(!stage)return;
    stage.scrollBy({top:direction*Math.max(240,stage.clientHeight*.82),behavior:'smooth'});
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
      scrollByPage(1);
      return;
    }
    if(event.key==='PageUp'&&canScrollUp){
      event.preventDefault();
      event.stopImmediatePropagation();
      scrollByPage(-1);
      return;
    }
    if(event.key===' '&&canScrollDown&&revealIsComplete()){
      event.preventDefault();
      event.stopImmediatePropagation();
      scrollByPage(1);
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
