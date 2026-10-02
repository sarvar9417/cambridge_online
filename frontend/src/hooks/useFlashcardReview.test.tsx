import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { useFlashcardReview } from './useFlashcardReview';

vi.mock('../lib/api', () => ({ api: vi.fn() }));

describe('Flashcard review', () => {
  let root: Root;
  let container: HTMLDivElement;
  let review: ReturnType<typeof useFlashcardReview>;
  const reviewed = vi.fn();
  function Host() { review = useFlashcardReview('card-one', reviewed); return null; }
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.mocked(api).mockReset();
    reviewed.mockReset();
    container = document.createElement('div');
    root = createRoot(container);
    await act(async () => root.render(<Host />));
  });
  afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });

  it('accepts only one review while saving, even before a rerender', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(api).mockReturnValue(new Promise(done => { resolve = done; }));
    let saving!: Promise<void>;
    await act(async () => { saving = review.grade(1); await review.grade(5); });
    expect(api).toHaveBeenCalledTimes(1);
    expect(review.reviewing).toBe(true);
    expect(reviewed).not.toHaveBeenCalled();
    await act(async () => { resolve({}); await saving; });
    expect(reviewed).toHaveBeenCalledExactlyOnceWith('card-one');
    expect(review.reviewing).toBe(false);
  });

  it('retains a failed card, shows the error and allows a successful retry', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({});
    await act(async () => review.grade(3));
    expect(reviewed).not.toHaveBeenCalled();
    expect(review.error).toBe('Connection interrupted');
    expect(review.reviewing).toBe(false);
    await act(async () => review.grade(3));
    expect(review.error).toBe('');
    expect(reviewed).toHaveBeenCalledExactlyOnceWith('card-one');
  });
});
