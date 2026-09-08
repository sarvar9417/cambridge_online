const CLASSROOM_STUDIO = '.lesson-topic-studio:fullscreen, .lesson-topic-studio.is-presenting';

function currentStudio() {
  return document.querySelector<HTMLElement>(CLASSROOM_STUDIO);
}

function teachingFragments(page: HTMLElement) {
  return [...page.querySelectorAll<HTMLElement>('.lesson-page-fragment')]
    .filter(fragment => !fragment.closest('.lesson-source-transcript'));
}

function ensureStatus(studio: HTMLElement) {
  let status = studio.querySelector<HTMLDivElement>('.lesson-classroom-fragment-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'lesson-classroom-fragment-status';
    status.setAttribute('aria-hidden', 'true');
    studio.append(status);
  }
  return status;
}

function focusFragment(studio: HTMLElement, page: HTMLElement) {
  const fragments = teachingFragments(page);
  const status = ensureStatus(studio);

  if (!fragments.length) {
    status.classList.add('is-single');
    if (status.textContent) status.textContent = '';
    return;
  }

  const pageRect = page.getBoundingClientRect();
  const focusLine = pageRect.top + Math.min(page.clientHeight * .28, 230);
  let activeIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  fragments.forEach((fragment, index) => {
    const rect = fragment.getBoundingClientRect();
    const reference = rect.top <= focusLine && rect.bottom >= focusLine
      ? focusLine
      : Math.max(rect.top, Math.min(focusLine, rect.bottom));
    const distance = Math.abs(reference - focusLine);
    if (distance < bestDistance) {
      bestDistance = distance;
      activeIndex = index;
    }
  });

  fragments.forEach((fragment, index) => {
    fragment.classList.toggle('classroom-fragment-focus', index === activeIndex);
  });

  status.classList.toggle('is-single', fragments.length <= 1);
  const label = `Qism ${activeIndex + 1}/${fragments.length}`;
  if (status.textContent !== label) status.textContent = label;
}

/**
 * Teacher pacing layer for classroom projection.
 * It does not hide or dim student content. It only marks the semantic fragment
 * nearest the teaching focus line so the teacher and class can track the current idea.
 */
export function installLessonClassroomFocus() {
  let boundPage: HTMLElement | null = null;
  let releasePage: (() => void) | null = null;

  const bind = () => {
    const studio = currentStudio();
    const page = studio?.querySelector<HTMLElement>('.lesson-topic-page') ?? null;

    if (page === boundPage) {
      if (studio && page) focusFragment(studio, page);
      return;
    }

    releasePage?.();
    releasePage = null;
    boundPage = page;

    if (!studio || !page) return;

    const update = () => focusFragment(studio, page);
    page.addEventListener('scroll', update, { passive: true });
    releasePage = () => page.removeEventListener('scroll', update);
    update();
  };

  const observer = new MutationObserver(bind);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-page-id'],
  });

  document.addEventListener('fullscreenchange', bind);
  window.addEventListener('resize', bind);
  bind();

  return () => {
    observer.disconnect();
    document.removeEventListener('fullscreenchange', bind);
    window.removeEventListener('resize', bind);
    releasePage?.();
    document.querySelectorAll('.classroom-fragment-focus').forEach(node => node.classList.remove('classroom-fragment-focus'));
    document.querySelectorAll('.lesson-classroom-fragment-status').forEach(node => node.remove());
  };
}
