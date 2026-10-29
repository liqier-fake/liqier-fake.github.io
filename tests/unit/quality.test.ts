import { describe, expect, it } from 'vitest';
import { selectQualityProfile } from '../../src/lib/world/quality';

describe('selectQualityProfile', () => {
  it('uses the full profile on capable desktop displays', () => {
    expect(selectQualityProfile({ width: 1440, devicePixelRatio: 2.5, hardwareConcurrency: 12, dataSaver: false })).toEqual({
      tier: 'high',
      pixelRatio: 2,
      particleCount: 1600,
      shadows: true,
      reflections: true,
      postprocessing: true,
    });
  });

  it('caps effects and pixel ratio on mobile', () => {
    expect(selectQualityProfile({ width: 390, devicePixelRatio: 3, hardwareConcurrency: 4, dataSaver: false })).toEqual({
      tier: 'medium',
      pixelRatio: 1.5,
      particleCount: 700,
      shadows: false,
      reflections: true,
      postprocessing: false,
    });
  });

  it('prefers the low-data profile when saving data', () => {
    expect(selectQualityProfile({ width: 1440, devicePixelRatio: 2, hardwareConcurrency: 8, dataSaver: true })).toEqual({
      tier: 'low',
      pixelRatio: 1,
      particleCount: 200,
      shadows: false,
      reflections: false,
      postprocessing: false,
    });
  });
});
