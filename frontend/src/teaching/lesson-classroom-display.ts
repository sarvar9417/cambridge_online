const CLASSROOM_STUDIO = '.lesson-topic-studio:fullscreen, .lesson-topic-studio.is-presenting';
const INTERACTIVE = '.lesson-exam-scroll,.hodder-table-wrap,details,input,textarea,select,button,[contenteditable="true"]';

function currentStudio() {
  return document.querySelector<HTMLElement>(CLASSROOM_STUDIO);
}

function navButton(studio: HTMLElement, direction: 'previous' | 'next') {
  const buttons = studio.querySelectorAll<HTMLButtonElement>('.lesson-topic-nav > button');
  return direction === 'previous' ? buttons[0] ?? null : buttons[buttons.length - 1] ?? null;
}

function activateNav(studio: HTMLElement, direction: 'previous' | 'next') {
  const button = navButton(studio, direction);
  if (button && !button.disabled) button.click();
}

function ensureClassroomChrome(studio: HTMLElement) {
  let meter = studio.querySelector<HTMLDivElement>('.lesson-classroom-scroll-meter');
  if (!meter) {
    meter = document.createElement('div');
    meter.className = 'lesson-classroom-scroll-meter';
    meter.setAttribute('aria-hidden', 'true');
    meter.innerHTML = '<span></span>';
    studio.append(meter);
  }

  let cue = studio.querySelector<HTMLDivElement>('.lesson-classroom-scroll-cue');
  if (!cue) {
    cue = document.createElement('div');
    cue.className = 'lesson-classroom-scroll-cue';
    cue.setAttribute('aria-hidden', 'true');
    cue.textContent = '↓ Davomi bor';
    studio.append(cue);
  }

  return { meter, cue };
}

/**
 * Classroom projection behavior for semantic lesson pages.
 *
 * - mouse/touch scrolling remains native;
 * - PageDown/Space/ArrowDown scroll through the current page before advancing;
 * - PageUp/ArrowUp scroll upward before returning to the previous page;
 * - ArrowRight/ArrowLeft remain explicit semantic-page navigation;
 * - a subtle projector-only progress rail shows whether more content exists below.
 */
export function installLessonClassroomDisplay() {
  let boundPage: HTMLElement | null = null;
  let releasePage: (() => void) | null = null;

  const bind = () => {
    const studio = currentStudio();
    const page = studio?.querySelector<HTMLElement>('.lesson-topic-page') ?? null;
    if (page === boundPage) {
      if (studio && page) update(studio, page);
      return;
    }

    releasePage?.();
    releasePage = null;
    boundPage = page;
    if (!studio || !page) return;

    const onScroll = () => update(studio, page);
    page.addEventListener('scroll', onScroll, { passive: true });
    releasePage = () => page.removeEventListener('scroll', onScroll);
    update(studio, page);
  };

  const update = (studio: HTMLElement, page: HTMLElement) => {
    const { meter, cue } = ensureClassroomChrome(studio);
    const maxScroll = Math.max(0, page.scrollHeight - page.clientHeight);
    const scrollable = maxScroll > 8;
    const atEnd = !scrollable || page.scrollTop >= maxScroll - 6;
    const progress = !scrollable ? 100 : Math.max(0, Math.min(100, (page.scrollTop / maxScroll) * 100));

    studio.classList.toggle('classroom-scrollable', scrollable);
    studio.classList.toggle('classroom-at-end', atEnd);
    meter.querySelector<HTMLElement>('span')?.style.setProperty('height', `${progress}%`);
    cue.textContent = atEnd ? 'Page tugadi' : '↓ Davomi bor';
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const studio = currentStudio();
    if (!studio) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE)) return;

    const page = studio.querySelector<HTMLElement>('.lesson-topic-page');
    if (!page) return;
    const maxScroll = Math.max(0, page.scrollHeight - page.clientHeight);
    const atTop = page.scrollTop <= 6;
    const atEnd = maxScroll <= 8 || page.scrollTop >= maxScroll - 6;
    const step = Math.max(240, page.clientHeight * .78);

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopImmediatePropagation();
      activateNav(studio, 'next');
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopImmediatePropagation();
      activateNav(studio, 'previous');
      return;
    }
    if (event.key === 'PageDown' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (atEnd) activateNav(studio, 'next');
      else page.scrollBy({ top: step, behavior: event.repeat ? 'auto' : 'smooth' });
      return;
    }
    if (event.key === 'PageUp' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (atTop) activateNav(studio, 'previous');
      else page.scrollBy({ top: -step, behavior: event.repeat ? 'auto' : 'smooth' });
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      event.stopImmediatePropagation();
      page.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      event.stopImmediatePropagation();
      page.scrollTo({ top: maxScroll, behavior: 'smooth' });
    }
  };

  const observer = new MutationObserver(bind);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-page-id'] });
  document.addEventListener('fullscreenchange', bind);
  window.addEventListener('resize', bind);
  window.addEventListener('keydown', onKeyDown, true);
  bind();

  return () => {
    observer.disconnect();
    document.removeEventListener('fullscreenchange', bind);
    window.removeEventListener('resize', bind);
    window.removeEventListener('keydown', onKeyDown, true);
    releasePage?.();
    document.querySelectorAll('.lesson-classroom-scroll-meter,.lesson-classroom-scroll-cue').forEach(node => node.remove());
  };
}
