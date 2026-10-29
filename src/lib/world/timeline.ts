export const PHASE_BOUNDARIES = {
  gate: 0.28,
  hub: 0.42,
  approach: 0.72,
} as const;

export type WorldPhase = 'arrival' | 'gate' | 'hub' | 'approach';
import { dragonModeForPhase, type DragonMode } from './dragon';
export type { DragonMode } from './dragon';

export interface WorldFrame {
  phase: WorldPhase;
  cameraT: number;
  fogDensity: number;
  worldLight: number;
  dragonMode: DragonMode;
  focusedEntranceId: string | null;
}

const reducedViewpoints: Record<WorldPhase, number> = {
  arrival: 0,
  gate: 0.36,
  hub: 0.58,
  approach: 0.86,
};

const entrances = [
  'paper-slip:first-light',
  'essay-pavilion:after-the-long-night',
  'image-corridor:moonlit-water',
  'moon-tree:borrowed-light',
] as const;

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function phaseAt(progress: number): WorldPhase {
  if (progress < PHASE_BOUNDARIES.gate) return 'arrival';
  if (progress < PHASE_BOUNDARIES.hub) return 'gate';
  if (progress < PHASE_BOUNDARIES.approach) return 'hub';
  return 'approach';
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function entranceAt(progress: number): string | null {
  if (progress < PHASE_BOUNDARIES.approach) return null;
  const local = (progress - PHASE_BOUNDARIES.approach) / (1 - PHASE_BOUNDARIES.approach);
  const index = Math.min(entrances.length - 1, Math.floor(local * entrances.length));
  return entrances[index];
}

export function sampleWorldFrame(progress: number, reducedMotion: boolean): WorldFrame {
  const normalized = clampProgress(progress);
  const phase = phaseAt(normalized);

  return {
    phase,
    cameraT: reducedMotion ? reducedViewpoints[phase] : smoothstep(normalized),
    fogDensity: 0.045 - normalized * 0.027,
    worldLight: 0.48 + normalized * 0.52,
    dragonMode: dragonModeForPhase(phase),
    focusedEntranceId: entranceAt(normalized),
  };
}
