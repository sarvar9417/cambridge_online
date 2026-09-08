export function installLessonSlideScrollController() {
  const getStudio = () => document.querySelector<HTMLElement>('.lesson-studio.hodder-studio');
  const getSlide = () => getStudio()?.querySelector<HTMLElement>('.lesson-slide') ?? null;

  const resetSlide = () => {
    const slide = getSlide();
    if (!slide) return;
    slide.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const queueReset = () => {
    requestAnimationFrame(() => requestAnimationFrame(resetSlide));
  };

  let currentStudio: HTMLElement | null = null;
  let lastActiveSlide = '';

  const syncActiveSlide = () => {
    const studio = getStudio();
    if (!studio) return;
    const active = studio.querySelector<HTMLButtonElement>('.lesson-nav > div button.active');
    const identity = active?.getAttribute('aria-label') ?? '';
    if (identity && identity !== lastActiveSlide) {
      lastActiveSlide = identity;
      queueReset();
    }
  };

  const activeObserver = new MutationObserver(syncActiveSlide);

  const bindStudio = () => {
    const nextStudio = getStudio();
    if (nextStudio === currentStudio) {
      syncActiveSlide();
      return;
    }

    activeObserver.disconnect();
    currentStudio = nextStudio;
    lastActiveSlide = '';
    if (!currentStudio) return;

    activeObserver.observe(currentStudio, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    syncActiveSlide();
    queueReset();
  };

  /* The Lessons route can render library -> chapter hub -> lesson without
     remounting the wrapper. Watch DOM mounts as well as slide class changes so
     the scroll controller is attached when the studio appears later. */
  const mountObserver = new MutationObserver(bindStudio);
  const startMountObserver = () => {
    if (!document.body) return;
    mountObserver.observe(document.body, { childList: true, subtree: true });
    bindStudio();
  };

  const interactiveSelector = '.lesson-exam-scroll,.hodder-table-wrap,details,input,textarea,select,button,[contenteditable="true"]';

  const onKeyDown = (event: KeyboardEvent) => {
    if (!['PageDown', 'PageUp', ' '].includes(event.key)) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(interactiveSelector)) return;

    const slide = getSlide();
    if (!slide) return;

    const maxScrollTop = Math.max(0, slide.scrollHeight - slide.clientHeight);
    if (maxScrollTop <= 2) return;

    const atTop = slide.scrollTop <= 2;
    const atBottom = slide.scrollTop >= maxScrollTop - 2;
    const goingDown = event.key === 'PageDown' || event.key === ' ';

    if ((goingDown && !atBottom) || (!goingDown && !atTop)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const distance = Math.max(160, Math.round(slide.clientHeight * 0.82));
      slide.scrollBy({ top: goingDown ? distance : -distance, behavior: 'smooth' });
    }
  };

  window.addEventListener('keydown', onKeyDown, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMountObserver, { once: true });
  } else {
    startMountObserver();
  }

  return () => {
    mountObserver.disconnect();
    activeObserver.disconnect();
    window.removeEventListener('keydown', onKeyDown, true);
  };
}
