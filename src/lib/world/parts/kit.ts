import * as THREE from 'three';

/** Collects GPU resources created while building the world so they can be freed together. */
export class Kit {
  private readonly items: Array<{ dispose(): void }> = [];

  keep<T extends { dispose(): void }>(value: T): T {
    this.items.push(value);
    return value;
  }

  dispose(): void {
    this.items.splice(0).forEach((item) => item.dispose());
  }
}

/** Seeded PRNG so the world is composed identically on every visit. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft radial falloff used by every additive glow sprite. */
export function glowTexture(kit: Kit, size = 128): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,.55)');
    g.addColorStop(0.45, 'rgba(255,255,255,.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = kit.keep(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const NOISE_GLSL = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3. - 2. * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
               mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0., a = .5;
    for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; }
    return v;
  }
`;

/** Shared palette, linear-space friendly. */
export const PALETTE = {
  zenith: new THREE.Color(0x02060d),
  sky: new THREE.Color(0x071425),
  horizon: new THREE.Color(0x173f6a),
  fog: new THREE.Color(0x0a1d33),
  silver: new THREE.Color(0xdce9f3),
  amber: new THREE.Color(0xf1a65a),
  vermilion: new THREE.Color(0xc9493a),
  violet: new THREE.Color(0x9a7cff),
  blossom: new THREE.Color(0xf3c9d6),
};
