import { describe, expect, it } from 'vitest';
import { chapter14PresentationStoryboard } from './chapter14-presentation-storyboard';
import { hasChapter14PresentationVisualV4 } from './Chapter14PresentationVisualsV4';

const FLAGSHIP_IDS = [
  'h14p-141-stack',
  'h14p-141-http',
  'h14p-141-email',
  'h14p-141-tcp',
  'h14p-142-circuit-route',
  'h14p-142-packet-route',
];

describe('Chapter 14 visual-first presentation pass', () => {
  it('routes the six flagship network processes through dedicated animated visuals', () => {
    const storyboard = chapter14PresentationStoryboard('overview') ?? [];
    const byId = new Map(storyboard.map(beat => [beat.id, beat]));

    for (const id of FLAGSHIP_IDS) {
      const beat = byId.get(id);
      expect(beat, `Missing flagship scene ${id}`).toBeDefined();
      expect(hasChapter14PresentationVisualV4(beat!), `${id} must use V4 visual`).toBe(true);
    }
  });

  it('keeps source page provenance on every visual-first scene', () => {
    const storyboard = chapter14PresentationStoryboard('overview') ?? [];
    const flagship = storyboard.filter(beat => FLAGSHIP_IDS.includes(beat.id));
    expect(flagship).toHaveLength(FLAGSHIP_IDS.length);
    expect(flagship.every(beat => beat.sourcePages.length > 0)).toBe(true);
  });
});
