/**
 * Live Challenge presentation policy. Kept separate from assessment settings:
 * no reward can change marks, mastery, scoring, or leaderboard ranking.
 */
export type LiveEffectIntensity='calm'|'balanced'|'spectacular';
export interface LiveEffectSettings {
  animations:boolean;
  sound:boolean;
  intensity:LiveEffectIntensity;
  publicCelebrations:boolean;
}
export const DEFAULT_LIVE_EFFECTS:Readonly<LiveEffectSettings>=Object.freeze({
  animations:true,
  sound:false,
  intensity:'balanced',
  publicCelebrations:true,
});

export function normalizeLiveEffects(value:unknown):LiveEffectSettings {
  const raw=value && typeof value==='object' && !Array.isArray(value)
    ? value as Record<string,unknown>: {};
  return {
    animations:typeof raw.animations==='boolean'?raw.animations:true,
    sound:raw.sound===true,
    intensity:raw.intensity==='calm'||raw.intensity==='spectacular'
      ? raw.intensity:'balanced',
    publicCelebrations:typeof raw.publicCelebrations==='boolean'
      ? raw.publicCelebrations:true,
  };
}
