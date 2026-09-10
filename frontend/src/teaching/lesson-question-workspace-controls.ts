type WorkspaceAudience = 'student' | 'teacher';

let preferredAudience: WorkspaceAudience = 'student';
let installCount = 0;
let observer: MutationObserver | null = null;
let scanScheduled = false;

function createButton(className: string, text: string) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = text;
  return node;
}

function updateProjectorLabels() {
  document.querySelectorAll<HTMLButtonElement>('.lesson-workspace-projector').forEach((button) => {
    const shell = button.closest('.lesson-workspace-shell');
    const studio = shell?.closest('.lesson-studio');
    const active = Boolean(studio && document.fullscreenElement === studio);
    button.textContent = active ? 'Exit projector' : 'Projector';
    button.setAttribute('aria-pressed', String(active));
  });
}

function enhanceWorkspace(shell: HTMLElement) {
  if (shell.dataset.classroomControlsReady === 'true') return;

  const toolbar = shell.querySelector<HTMLElement>('.lesson-workspace-toolbar');
  const sideColumn = shell.querySelector<HTMLElement>('.lesson-workspace-side-column');
  const navigation = shell.querySelector<HTMLElement>('.lesson-workspace-navigation');
  if (!toolbar || !sideColumn || !navigation) return;

  shell.dataset.classroomControlsReady = 'true';

  const audienceControls = document.createElement('div');
  audienceControls.className = 'lesson-workspace-audience-controls';
  audienceControls.setAttribute('role', 'group');
  audienceControls.setAttribute('aria-label', 'Workspace view');

  const student = createButton('lesson-workspace-audience', 'Student view');
  const teacher = createButton('lesson-workspace-audience', 'Teacher view');
  const projector = createButton('lesson-workspace-projector', 'Projector');
  projector.setAttribute('aria-pressed', 'false');
  audienceControls.append(student, teacher, projector);
  toolbar.append(audienceControls);

  const originalReveal = sideColumn.querySelector<HTMLButtonElement>('.lesson-workspace-reveal');
  const scheme = sideColumn.querySelector<HTMLElement>('.lesson-workspace-scheme');
  const reveal = originalReveal?.cloneNode(true) as HTMLButtonElement | undefined;
  const revealStatus = document.createElement('span');
  revealStatus.className = 'lesson-workspace-reveal-status';
  revealStatus.setAttribute('aria-live', 'polite');

  if (originalReveal && reveal && scheme) {
    originalReveal.replaceWith(reveal);
    reveal.insertAdjacentElement('afterend', revealStatus);
  }

  const markPoints = scheme
    ? [...scheme.querySelectorAll<HTMLElement>('.lesson-workspace-mark-points > li')]
    : [];
  let revealedPoints = 0;

  const applyPointVisibility = () => {
    markPoints.forEach((point, index) => {
      const visible = index < revealedPoints;
      point.hidden = !visible;
      point.classList.toggle('lesson-workspace-mp-revealed', visible);
    });
  };

  const updateRevealUi = () => {
    if (!reveal || !scheme) return;
    const total = markPoints.length;
    revealStatus.textContent = total ? `${revealedPoints} / ${total} mark points` : '';

    if (scheme.hidden) {
      reveal.textContent = 'Reveal mark scheme';
      reveal.setAttribute('aria-expanded', 'false');
      return;
    }

    reveal.setAttribute('aria-expanded', 'true');
    if (!total) reveal.textContent = 'Hide mark scheme';
    else if (revealedPoints < total) reveal.textContent = revealedPoints === 0 ? 'Reveal first mark point' : 'Reveal next mark point';
    else reveal.textContent = 'Hide mark scheme';
  };

  const resetScheme = () => {
    if (!scheme) return;
    scheme.hidden = true;
    revealedPoints = 0;
    applyPointVisibility();
    updateRevealUi();
  };

  const applyAudience = (audience: WorkspaceAudience) => {
    preferredAudience = audience;
    shell.dataset.audience = audience;
    student.setAttribute('aria-pressed', String(audience === 'student'));
    teacher.setAttribute('aria-pressed', String(audience === 'teacher'));
    student.classList.toggle('active', audience === 'student');
    teacher.classList.toggle('active', audience === 'teacher');
    if (audience === 'student') resetScheme();
  };

  student.addEventListener('click', () => applyAudience('student'));
  teacher.addEventListener('click', () => applyAudience('teacher'));

  if (reveal && scheme) {
    resetScheme();
    reveal.addEventListener('click', () => {
      if (shell.dataset.audience !== 'teacher') {
        applyAudience('teacher');
        return;
      }

      if (scheme.hidden) {
        scheme.hidden = false;
        revealedPoints = 0;
        applyPointVisibility();
        updateRevealUi();
        scheme.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }

      if (revealedPoints < markPoints.length) {
        revealedPoints += 1;
        applyPointVisibility();
        updateRevealUi();
        markPoints[revealedPoints - 1]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }

      resetScheme();
    });
  }

  projector.addEventListener('click', async () => {
    const studio = shell.closest<HTMLElement>('.lesson-studio');
    if (!studio || !document.fullscreenEnabled) return;
    try {
      if (document.fullscreenElement === studio) await document.exitFullscreen();
      else await studio.requestFullscreen();
    } finally {
      updateProjectorLabels();
    }
  });

  const navHint = document.createElement('span');
  navHint.className = 'lesson-workspace-navigation-hint';
  navHint.textContent = '← → questions · T teacher · M mark point · P projector';
  const next = navigation.querySelector<HTMLButtonElement>('.lesson-workspace-nav:last-child');
  if (next) navigation.insertBefore(navHint, next);
  else navigation.append(navHint);

  shell.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    const previous = navigation.querySelector<HTMLButtonElement>('.lesson-workspace-nav:first-child');
    const nextQuestion = navigation.querySelector<HTMLButtonElement>('.lesson-workspace-nav:last-child');

    if (event.key === 'ArrowLeft' && previous && !previous.disabled) {
      event.preventDefault();
      previous.click();
    } else if (event.key === 'ArrowRight' && nextQuestion && !nextQuestion.disabled) {
      event.preventDefault();
      nextQuestion.click();
    } else if (event.key.toLowerCase() === 't') {
      event.preventDefault();
      applyAudience(shell.dataset.audience === 'teacher' ? 'student' : 'teacher');
    } else if (event.key.toLowerCase() === 'm' && reveal) {
      event.preventDefault();
      if (shell.dataset.audience !== 'teacher') applyAudience('teacher');
      reveal.click();
    } else if (event.key.toLowerCase() === 'p') {
      event.preventDefault();
      projector.click();
    }
  });

  applyAudience(preferredAudience);
  updateProjectorLabels();
}

function scan() {
  document.querySelectorAll<HTMLElement>('.lesson-workspace-shell').forEach(enhanceWorkspace);
}

function scheduleScan() {
  if (scanScheduled) return;
  scanScheduled = true;
  queueMicrotask(() => {
    scanScheduled = false;
    scan();
  });
}

export function installLessonQuestionWorkspaceControls() {
  if (typeof document === 'undefined') return () => {};
  installCount += 1;
  if (installCount === 1) {
    scan();
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('fullscreenchange', updateProjectorLabels);
  }

  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;
    installCount = Math.max(0, installCount - 1);
    if (installCount !== 0) return;
    observer?.disconnect();
    observer = null;
    scanScheduled = false;
    document.removeEventListener('fullscreenchange', updateProjectorLabels);
  };
}
