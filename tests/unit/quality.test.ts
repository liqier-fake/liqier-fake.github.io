import { describe, expect, it } from 'vitest';
import { isSoftwareRenderer, selectQualityProfile } from '../../src/lib/world/quality';

describe('selectQualityProfile', () => {
  it('drops to the light profile when WebGL is emulated on the CPU', () => {
    expect(selectQualityProfile({ width: 1440, devicePixelRatio: 2, hardwareConcurrency: 12, dataSaver: false, softwareRenderer: true }).tier).toBe('low');
    expect(isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)')).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe(false);
  });

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
