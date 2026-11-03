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

function softDot(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

const modeOffsets: Record<DragonMode, DragonVector> = {
  lead: { x: 2.8, y: 5.6, z: -12 },
  circle: { x: 0, y: 10.2, z: -18 },
  rest: { x: 6.4, y: 6.6, z: -31 },
  indicate: { x: 5.6, y: 4.6, z: -29 },
  return: { x: -4.8, y: 6.4, z: -22 },
  idle: { x: -8.5, y: 7.6, z: -37 },
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
  private placed = false;
  private readonly target = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly textures: THREE.Texture[] = [];
  private time = 0;

  constructor(scene: THREE.Scene, profile: QualityProfile) {
    this.trailCap = trailCapFor(profile);
    this.group.name = 'silver-dragon-companion';

    const pearl = this.keepMaterial(new THREE.MeshPhysicalMaterial({
      color: 0xe3edf3,
      emissive: 0x8fb2d4,
      emissiveIntensity: 0.85,
      metalness: 0.7,
      roughness: 0.24,
      clearcoat: 0.8,
    }));
    const mane = this.keepMaterial(new THREE.MeshBasicMaterial({ color: 0x9fb9d6, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    const bodyGeometry = this.keepGeometry(new THREE.SphereGeometry(0.29, 12, 8));

    // Dense, overlapping segments with a long taper read as one serpentine body, not beads.
    const finGeometry = this.keepGeometry(new THREE.ConeGeometry(0.07, 0.36, 5));
    const count = 46;
    for (let index = 0; index < count; index += 1) {
      const segment = new THREE.Mesh(bodyGeometry, pearl);
      const t = index / (count - 1);
      const scale = 0.18 + 0.82 * Math.pow(1 - t, 0.9) * (1 - Math.exp(-index * 0.9) * 0.25);
      segment.scale.set(scale * 1.05, scale * 0.92, scale * 1.5);
      segment.castShadow = profile.shadows;
      if (index > 2 && index % 3 === 0 && index < count - 4) {
        const fin = new THREE.Mesh(finGeometry, mane);
        fin.position.set(0, 0.27, 0.05);
        fin.rotation.x = 0.55;
        segment.add(fin);
      }
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
      horn.scale.setScalar(0.42);
      horn.position.set(side * 0.29, 0.4, 0.05);
      horn.rotation.z = side * -0.38;
      head.add(horn);
      const ribbon = new THREE.Mesh(this.keepGeometry(new THREE.PlaneGeometry(0.14, 2.4, 1, 6)), mane);
      ribbon.scale.set(0.6, 0.45, 0.45);
      ribbon.position.set(side * 0.4, 0.08, 0.62);
      ribbon.rotation.x = -0.42;
      head.add(ribbon);
    }

    const trailGeometry = this.keepGeometry(new THREE.BufferGeometry());
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.trailCap * 3), 3));
    this.trail = new THREE.Points(trailGeometry, this.keepMaterial(new THREE.PointsMaterial({
      map: this.keepTexture(softDot()),
      color: 0xc8e7ff,
      size: 0.22,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
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
    // glide between behaviours rather than teleporting when the mode changes
    const follow = this.placed ? 1 - Math.exp(-1.6 * Math.min(0.05, Math.max(0, delta))) : 1;
    this.placed = true;
    this.target.set(pose.position.x, pose.position.y, pose.position.z);
    this.group.position.lerp(this.target, follow);
    this.look.lerp(this.lookTarget.set(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z).sub(this.target).add(this.group.position), follow);
    this.group.lookAt(this.look);
    this.group.rotation.z = pose.roll;

    for (let index = 0; index < this.segments.length; index += 1) {
      const phase = this.time * 2.2 - index * 0.19;
      this.segments[index].position.set(
        Math.sin(phase) * Math.min(0.9, index * 0.024),
        Math.cos(phase * 0.72) * Math.min(0.38, index * 0.011),
        -index * 0.2,
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
    this.textures.forEach((item) => item.dispose());
  }

  private keepTexture<T extends THREE.Texture>(value: T): T {
    this.textures.push(value);
    return value;
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
