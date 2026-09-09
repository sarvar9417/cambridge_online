function isInteractiveTarget(target:EventTarget|null){
  return target instanceof HTMLElement && Boolean(target.closest('button,input,textarea,select,a,[contenteditable="true"]'));
}

function currentStage(){
  return document.querySelector<HTMLElement>('.lesson-experience.lx-present .lx-present-stage');
}

function revealIsComplete(){
  return document.querySelector('.lesson-experience.lx-present .lx-present-nav p')?.textContent?.includes('keyingi ekran')??false;
}

function dispatchReveal(){
  // LessonExperience owns reveal state. Re-dispatch Space after the capture
  // controller has consumed ArrowRight / the Next button.
  window.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));
}

/**
 * Presentation navigation guard.
 *
 * Rules:
 * 1. Progressive content is never skipped: ArrowRight and Next reveal first.
 * 2. Tall scenes are never skipped: after reveal, navigation scrolls the scene
 *    before moving to the next beat.
 * 3. Previous navigation scrolls upward before leaving a tall scene.
 * 4. Every new beat starts at the top.
 */
export function installPresentationScrollController(){
  let disposed=false;
  let stage:HTMLElement|null=null;
  let redispatching=false;

  const bind=()=>{stage=currentStage();};

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

  const state=()=>{
    const active=currentStage();
    stage=active;
    if(!stage)return {exists:false,down:false,up:false};
    const tolerance=4;
    return {
      exists:true,
      down:stage.scrollTop+stage.clientHeight<stage.scrollHeight-tolerance,
      up:stage.scrollTop>tolerance,
    };
  };

  const revealFromAlternativeControl=()=>{
    redispatching=true;
    try{dispatchReveal();}finally{redispatching=false;}
  };

  const onKeyDown=(event:KeyboardEvent)=>{
    if(redispatching||isInteractiveTarget(event.target))return;
    const current=state();
    if(!current.exists)return;

    if(event.key==='ArrowRight'){
      if(!revealIsComplete()){
        event.preventDefault();
        event.stopImmediatePropagation();
        revealFromAlternativeControl();
        return;
      }
      if(current.down){
        event.preventDefault();
        event.stopImmediatePropagation();
        scrollByPage(1);
        return;
      }
      return; // React moves to the next beat.
    }

    if(event.key==='ArrowLeft'){
      if(current.up){
        event.preventDefault();
        event.stopImmediatePropagation();
        scrollByPage(-1);
      }
      return;
    }

    if(event.key==='PageDown'&&current.down){
      event.preventDefault();
      event.stopImmediatePropagation();
      scrollByPage(1);
      return;
    }
    if(event.key==='PageUp'&&current.up){
      event.preventDefault();
      event.stopImmediatePropagation();
      scrollByPage(-1);
      return;
    }
    if(event.key===' '&&current.down&&revealIsComplete()){
      event.preventDefault();
      event.stopImmediatePropagation();
      scrollByPage(1);
    }
  };

  const onClick=(event:MouseEvent)=>{
    const target=event.target as HTMLElement|null;
    const navButton=target?.closest<HTMLButtonElement>('.lesson-experience.lx-present .lx-present-nav button');
    if(!navButton||navButton.disabled)return;
    const nav=document.querySelector('.lesson-experience.lx-present .lx-present-nav');
    if(!nav)return;
    const buttons=[...nav.querySelectorAll<HTMLButtonElement>('button')];
    const direction=buttons.indexOf(navButton)===0?-1:1;
    const current=state();
    if(!current.exists)return;

    if(direction===1&&!revealIsComplete()){
      event.preventDefault();
      event.stopImmediatePropagation();
      revealFromAlternativeControl();
      return;
    }
    if(direction===1&&current.down){
      event.preventDefault();
      event.stopImmediatePropagation();
      scrollByPage(1);
      return;
    }
    if(direction===-1&&current.up){
      event.preventDefault();
      event.stopImmediatePropagation();
      scrollByPage(-1);
    }
  };

  const onResize=()=>bind();
  window.addEventListener('hashchange',resetAfterRender);
  window.addEventListener('resize',onResize);
  document.addEventListener('fullscreenchange',resetAfterRender);
  document.addEventListener('keydown',onKeyDown,true);
  document.addEventListener('click',onClick,true);
  resetAfterRender();

  return()=>{
    disposed=true;
    window.removeEventListener('hashchange',resetAfterRender);
    window.removeEventListener('resize',onResize);
    document.removeEventListener('fullscreenchange',resetAfterRender);
    document.removeEventListener('keydown',onKeyDown,true);
    document.removeEventListener('click',onClick,true);
  };
}
