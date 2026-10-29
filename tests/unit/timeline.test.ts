import { describe, expect, it } from 'vitest';
import { clampProgress, sampleWorldFrame } from '../../src/lib/world/timeline';

describe('clampProgress', () => {
  it.each([
    [-0.5, 0],
    [Number.NaN, 0],
    [0.37, 0.37],
    [1.8, 1],
  ])('normalizes %s to %s', (input, expected) => {
    expect(clampProgress(input)).toBe(expected);
  });
});

describe('sampleWorldFrame', () => {
  it.each([
    [0, 'arrival'],
    [0.2799, 'arrival'],
    [0.28, 'gate'],
    [0.4199, 'gate'],
    [0.42, 'hub'],
    [0.7199, 'hub'],
    [0.72, 'approach'],
    [1, 'approach'],
  ] as const)('maps progress %s to %s', (progress, phase) => {
    expect(sampleWorldFrame(progress, false).phase).toBe(phase);
  });

  it('keeps the full-motion camera path monotonic', () => {
    const samples = [0, 0.1, 0.28, 0.42, 0.72, 0.9, 1].map(
      (progress) => sampleWorldFrame(progress, false).cameraT,
    );
    expect(samples).toEqual([...samples].sort((a, b) => a - b));
    expect(samples[0]).toBe(0);
    expect(samples.at(-1)).toBe(1);
  });

  it('uses fixed viewpoints when reduced motion is requested', () => {
    expect(sampleWorldFrame(0.1, true).cameraT).toBe(0);
    expect(sampleWorldFrame(0.35, true).cameraT).toBe(0.36);
    expect(sampleWorldFrame(0.6, true).cameraT).toBe(0.58);
    expect(sampleWorldFrame(0.9, true).cameraT).toBe(0.86);
  });

  it('is deterministic across rapid direction changes', () => {
    const before = sampleWorldFrame(0.2, false);
    sampleWorldFrame(0.1, false);
    sampleWorldFrame(0.9, false);
    const after = sampleWorldFrame(0.2, false);

    expect(after).toEqual(before);
  });

  it('assigns world and dragon states without leaking invalid numbers', () => {
    const frame = sampleWorldFrame(Number.NaN, false);
    expect(frame).toMatchObject({
      phase: 'arrival',
      dragonMode: 'lead',
      focusedEntranceId: null,
    });
    expect(Number.isFinite(frame.fogDensity)).toBe(true);
    expect(Number.isFinite(frame.worldLight)).toBe(true);
  });
});
