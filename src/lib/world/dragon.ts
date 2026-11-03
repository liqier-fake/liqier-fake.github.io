import * as THREE from 'three';
import type { QualityProfile } from './quality';
import type { WorldFrame, WorldPhase } from './timeline';

export type DragonMode = 'lead' | 'circle' | 'rest' | 'indicate' | 'return' | 'idle';

export interface DragonVector {
  x: number;
  y: number;
  z: number;
}

export interface DragonPose {
  position: DragonVector;
  lookAt: DragonVector;
  roll: number;
  trail: DragonVector[];
}

const TAU = Math.PI * 2;

const modeOffsets: Record<DragonMode, DragonVector> = {
  lead: { x: 2.8, y: 4.8, z: -10 },
  circle: { x: 0, y: 6.2, z: -16 },
  rest: { x: 5.8, y: 2.1, z: -21 },
  indicate: { x: 6.2, y: 4.1, z: -27 },
  return: { x: -4.8, y: 4.8, z: -17 },
  idle: { x: -5.2, y: 5.2, z: -18 },
};

export function dragonModeForPhase(phase: WorldPhase): DragonMode {
  return ({ arrival: 'lead', gate: 'circle', hub: 'idle', approach: 'indicate' } as const)[phase];
}

function pointFor(mode: DragonMode, t: number): DragonVector {
  const angle = (((t % 1) + 1) % 1) * TAU;
  const base = modeOffsets[mode];
  const radius = mode === 'circle' ? 6.4 : mode === 'idle' ? 3.1 : mode === 'rest' ? 1.2 : mode === 'lead' ? 1.2 : 2.25;
  const pace = mode === 'indicate' ? 0.48 : mode === 'rest' ? 0.2 : 1;
  return {
    x: base.x + Math.cos(angle * pace) * radius,
    y: base.y + Math.sin(angle * 2) * (mode === 'rest' ? 0.25 : 0.72),
    z: base.z + Math.sin(angle * pace) * radius * (mode === 'lead' ? 1.8 : 0.72),
  };
}

export function sampleDragonPose(mode: DragonMode, t: number, trailCap = 0): DragonPose {
  const normalized = ((t % 1) + 1) % 1;
  const position = pointFor(mode, normalized);
  const ahead = pointFor(mode, normalized + 0.008);
  const trail = Array.from({ length: Math.max(0, Math.floor(trailCap)) }, (_, index) =>
    pointFor(mode, normalized - (index + 1) * 0.009),
  );
  return {
    position,
    lookAt: ahead,
    roll: Math.sin(normalized * TAU) * (mode === 'rest' ? 0.05 : 0.18),
    trail,
  };
}

function trailCapFor(profile: QualityProfile): number {
  if (profile.tier === 'high') return 48;
  if (profile.tier === 'medium') return 28;
  return 12;
}

export class DragonController {
  readonly group = new THREE.Group();
  private readonly segments: THREE.Mesh[] = [];
  private readonly trail: THREE.Points;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly trailCap: number;
  private mode: DragonMode = 'lead';
  private time = 0;

  constructor(scene: THREE.Scene, profile: QualityProfile) {
    this.trailCap = trailCapFor(profile);
    this.group.name = 'silver-dragon-companion';

    const pearl = this.keepMaterial(new THREE.MeshPhysicalMaterial({
      color: 0xe3edf3,
      emissive: 0x789ab4,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.24,
      clearcoat: 0.8,
    }));
    const mane = this.keepMaterial(new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.72 }));
    const bodyGeometry = this.keepGeometry(new THREE.SphereGeometry(0.29, 12, 8));

    for (let index = 0; index < 22; index += 1) {
      const segment = new THREE.Mesh(bodyGeometry, pearl);
      const scale = 1 - index * 0.034;
      segment.scale.set(scale * 1.18, scale, scale * 1.38);
      segment.castShadow = profile.shadows;
      this.segments.push(segment);
      this.group.add(segment);
    }

    const head = this.segments[0];
    head.scale.set(1.72, 1.2, 1.8);
    const eyeMaterial = this.keepMaterial(new THREE.MeshBasicMaterial({ color: 0xf1a65a }));
    const eyeGeometry = this.keepGeometry(new THREE.SphereGeometry(0.055, 8, 6));
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.23, 0.13, -0.23);
      head.add(eye);
    }
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(this.keepGeometry(new THREE.ConeGeometry(0.13, 1.3, 7)), mane);
      horn.scale.setScalar(0.66);
      horn.position.set(side * 0.29, 0.4, 0.05);
      horn.rotation.z = side * -0.38;
      head.add(horn);
      const ribbon = new THREE.Mesh(this.keepGeometry(new THREE.PlaneGeometry(0.14, 2.4, 1, 6)), mane);
      ribbon.scale.setScalar(0.72);
      ribbon.position.set(side * 0.4, 0.08, 0.62);
      ribbon.rotation.x = -0.42;
      head.add(ribbon);
    }

    const trailGeometry = this.keepGeometry(new THREE.BufferGeometry());
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.trailCap * 3), 3));
    this.trail = new THREE.Points(trailGeometry, this.keepMaterial(new THREE.PointsMaterial({
      color: 0xc8e7ff,
      size: 0.13,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    })));
    this.group.add(this.trail);
    scene.add(this.group);
  }

  setMode(mode: DragonMode, _frame: WorldFrame): void {
    this.mode = mode;
  }

  update(delta: number, frame: WorldFrame): void {
    this.time += Math.min(0.05, Math.max(0, delta));
    if (frame.dragonMode !== this.mode) this.setMode(frame.dragonMode, frame);
    const pose = sampleDragonPose(this.mode, this.time * 0.055, this.trailCap);
    this.group.position.set(pose.position.x, pose.position.y, pose.position.z);
    this.group.lookAt(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z);
    this.group.rotation.z = pose.roll;

    for (let index = 0; index < this.segments.length; index += 1) {
      const phase = this.time * 2.2 - index * 0.38;
      this.segments[index].position.set(
        Math.sin(phase) * Math.min(0.8, index * 0.045),
        Math.cos(phase * 0.72) * Math.min(0.34, index * 0.02),
        -index * 0.4,
      );
      this.segments[index].rotation.y = Math.sin(phase) * 0.16;
    }

    const positions = this.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    pose.trail.forEach((point, index) => {
      positions.setXYZ(index, point.x - pose.position.x, point.y - pose.position.y, point.z - pose.position.z);
    });
    positions.needsUpdate = true;
  }

  getTrailCount(): number {
    return this.trailCap;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.geometries.forEach((item) => item.dispose());
    this.materials.forEach((item) => item.dispose());
  }

  private keepGeometry<T extends THREE.BufferGeometry>(value: T): T {
    this.geometries.push(value);
    return value;
  }

  private keepMaterial<T extends THREE.Material>(value: T): T {
    this.materials.push(value);
    return value;
  }
}
