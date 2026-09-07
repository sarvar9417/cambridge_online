// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { installLessonExamInsights } from './lesson-exam-insights';
import { installLessonExamWorkspaceV3 } from './lesson-exam-workspace-v3';

const settle = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

function mountExamCard() {
  const card = document.createElement('article');
  card.className = 'lesson-exam-card';
  const meta = document.createElement('div');
  meta.className = 'lesson-exam-meta';
  const ref = document.createElement('span');
  ref.textContent = '0478/23/M/J/26 Q5(a)';
  meta.append(ref);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lesson-question-open';
  button.textContent = 'Open question';
  card.append(meta, button);
  document.body.append(card);
  return card;
}

function mountCheckpoint() {
  const host = document.createElement('section');
  const contract = document.createElement('div');
  contract.className = 'lesson-checkpoint-contract';
  const strong = document.createElement('strong');
  strong.textContent = '7.1 Program development';
  contract.append(strong);
  host.append(contract);
  document.body.append(host);
  return host;
}

describe('Lesson Studio explicit DOM enhancer lifecycles', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('keeps module import side-effect free', async () => {
    const card = mountExamCard();
    const host = mountCheckpoint();
    await settle();

    expect(card.dataset.examWorkspaceV3).toBeUndefined();
    expect(card.querySelector('.lesson-question-open')?.textContent).toBe('Open question');
    expect(host.querySelector('.lesson-exam-insight')).toBeNull();
  });

  it('installs, cleans up and can reinstall both observers', async () => {
    const releaseWorkspace = installLessonExamWorkspaceV3();
    const releaseInsights = installLessonExamInsights();

    const card = mountExamCard();
    const host = mountCheckpoint();
    await settle();
    await settle();

    expect(card.dataset.examWorkspaceV3).toBe('true');
    expect(card.querySelector('.lesson-question-open')?.textContent).toBe('Open full source question');
    expect(host.querySelector('.lesson-exam-insight')).not.toBeNull();

    releaseInsights();
    releaseWorkspace();
    releaseInsights();
    releaseWorkspace();

    document.body.replaceChildren();
    const detachedCard = mountExamCard();
    const detachedHost = mountCheckpoint();
    await settle();
    await settle();

    expect(detachedCard.dataset.examWorkspaceV3).toBeUndefined();
    expect(detachedHost.querySelector('.lesson-exam-insight')).toBeNull();

    const releaseWorkspaceAgain = installLessonExamWorkspaceV3();
    const releaseInsightsAgain = installLessonExamInsights();
    await settle();
    await settle();

    expect(detachedCard.dataset.examWorkspaceV3).toBe('true');
    expect(detachedHost.querySelector('.lesson-exam-insight')).not.toBeNull();

    releaseInsightsAgain();
    releaseWorkspaceAgain();
  });
});
