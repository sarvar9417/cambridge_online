import { describe, expect, it } from 'vitest';
import {
  CHAPTER_14_PRESENTATION_SCENE_COUNT,
  chapter14PresentationStoryboard,
} from './chapter14-presentation-storyboard';

describe('Chapter 14 presentation entry', () => {
  it('opens the full curated chapter storyboard from the overview route', () => {
    const storyboard = chapter14PresentationStoryboard('overview');
    expect(storyboard).not.toBeNull();
    expect(storyboard).toHaveLength(CHAPTER_14_PRESENTATION_SCENE_COUNT);
    expect(storyboard?.[0]?.id).toBe('h14p-141-hook');
    expect(storyboard?.at(-1)?.id).toBe('h14p-142-recap');
  });
});
