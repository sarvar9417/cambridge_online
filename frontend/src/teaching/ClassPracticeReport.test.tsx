import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { ClassPracticeReport } from './ClassPracticeReport';

vi.mock('../lib/api', () => ({ api: vi.fn() }));
const mockApi = vi.mocked(api);
const base = {
  classId: 'class-1', className: '10-A CS', courseCode: '9618',
  studentCount: 24, periodDays: 30, minimumParticipants: 5,
  assessed: false, privacy: 'aggregate_only',
};

describe('teacher class formative report', () => {
  let root: Root;
  let container: HTMLDivElement;
  async function render() {
    await act(async () => {
      root.render(<ClassPracticeReport classId="class-1" />);
      await Promise.resolve();
      await Promise.resolve();
    });
  }
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mockApi.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('does not show low-participation results', async () => {
    mockApi.mockResolvedValue({ data: { ...base, status: 'insufficient_data' } });
    await render();
    expect(container.textContent).toContain('Kamida 5 nafar');
    expect(container.querySelector('.cl-report-stats')).toBeNull();
    expect(mockApi).toHaveBeenCalledWith('/classes/class-1/practice-report');
  });

  it('shows aggregate rounds and chapter-level difficulty without student identities', async () => {
    mockApi.mockResolvedValue({ data: {
      ...base, status: 'ready', participatingStudents: 8, totalRounds: 25,
      scoredRounds: 14, reportedCorrect: 40, reportedIncorrect: 12,
      modes: [{ mode: 'quiz', rounds: 10 }],
      difficultTerms: [{ term: 'Encryption', chapterNo: 17, learners: 5, correct: 3, incorrect: 8 }],
    } });
    await render();
    expect(container.querySelector('.cl-report-stats')?.textContent).toContain('25');
    expect(container.textContent).toContain('Encryption');
    expect(container.textContent).toContain('Flash Cards');
    expect(container.textContent).not.toContain('Student ID');
  });

  it('reports an unavailable backend rather than inventing metrics', async () => {
    mockApi.mockRejectedValue(new Error('migration missing'));
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('migratsiyasini tekshiring');
    expect(container.querySelector('.cl-report-stats')).toBeNull();
  });
});
