import { describe, expect, it } from 'vitest';
import { dragonModeForPhase, sampleDragonPose, type DragonMode } from '../../src/lib/world/dragon';

describe('silver dragon motion contract', () => {
  it('maps every world phase to a companion behavior', () => {
    expect(dragonModeForPhase('arrival')).toBe('lead');
    expect(dragonModeForPhase('gate')).toBe('circle');
    expect(dragonModeForPhase('hub')).toBe('idle');
    expect(dragonModeForPhase('approach')).toBe('indicate');
  });

  it.each<DragonMode>(['lead', 'circle', 'rest', 'indicate', 'return', 'idle'])('%s poses stay finite', (mode) => {
    for (const t of [0, 0.125, 0.5, 0.875, 1]) {
      const pose = sampleDragonPose(mode, t);
      expect(Object.values(pose.position).every(Number.isFinite)).toBe(true);
      expect(Object.values(pose.lookAt).every(Number.isFinite)).toBe(true);
      expect(Number.isFinite(pose.roll)).toBe(true);
    }
  });

  it.each<DragonMode>(['lead', 'circle', 'rest', 'indicate', 'return', 'idle'])('%s loops continuously', (mode) => {
    const start = sampleDragonPose(mode, 0);
    const end = sampleDragonPose(mode, 1);
    expect(end.position.x).toBeCloseTo(start.position.x, 8);
    expect(end.position.y).toBeCloseTo(start.position.y, 8);
    expect(end.position.z).toBeCloseTo(start.position.z, 8);
    expect(end.roll).toBeCloseTo(start.roll, 8);
  });

  it('caps the pooled trail by quality tier', () => {
    expect(sampleDragonPose('lead', 0.4, 24).trail.length).toBeLessThanOrEqual(24);
    expect(sampleDragonPose('lead', 0.4, 5).trail).toHaveLength(5);
  });
});
