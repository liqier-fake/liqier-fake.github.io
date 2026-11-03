import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { QualityProfile } from './quality';
import type { WorldFrame, WorldPhase } from './timeline';
import { NOISE_GLSL } from './parts/kit';
import { MOON_DIR } from './parts/sky';

/*
 * The world's companion: a luminous moon whale (月鲸) that glides through the night sky.
 * The module keeps its original "dragon" API names so the timeline, diagnostics and tests stay stable.
 */

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

/** Each behaviour is a wide, slow elliptical glide high over the water, framed by that chapter's camera. */
const glides: Record<DragonMode, { c: DragonVector; rx: number; rz: number; bob: number }> = {
  lead: { c: { x: 0, y: 16, z: -34 }, rx: 13, rz: 7, bob: 1 },
  circle: { c: { x: 0, y: 12.5, z: -24 }, rx: 11, rz: 8, bob: 1.2 },
  rest: { c: { x: 6, y: 9.5, z: -36 }, rx: 5, rz: 4, bob: 0.5 },
  indicate: { c: { x: 3, y: 14.5, z: -50 }, rx: 13, rz: 5, bob: 0.8 },
  return: { c: { x: -3, y: 11, z: -28 }, rx: 10, rz: 7, bob: 1 },
  idle: { c: { x: 0, y: 12, z: -50 }, rx: 14, rz: 5, bob: 1 },
};

export function dragonModeForPhase(phase: WorldPhase): DragonMode {
  return ({ arrival: 'lead', gate: 'circle', hub: 'idle', approach: 'indicate' } as const)[phase];
}

function pointFor(mode: DragonMode, t: number): DragonVector {
  const angle = (((t % 1) + 1) % 1) * TAU;
  const { c, rx, rz, bob } = glides[mode];
  return {
    x: c.x + Math.cos(angle) * rx,
    y: c.y + Math.sin(angle * 2) * bob * 0.5,
    z: c.z + Math.sin(angle) * rz,
  };
}

export function sampleDragonPose(mode: DragonMode, t: number, trailCap = 0): DragonPose {
  const normalized = ((t % 1) + 1) % 1;
  const position = pointFor(mode, normalized);
  const ahead = pointFor(mode, normalized + 0.01);
  const trail = Array.from({ length: Math.max(0, Math.floor(trailCap)) }, (_, index) =>
    pointFor(mode, normalized - (index + 1) * 0.004),
  );
  return {
    position,
    lookAt: ahead,
    // a gentle bank into the turn, breathing slightly with the glide
    roll: -0.14 + Math.sin(normalized * TAU * 2) * 0.04,
    trail,
  };
}

function trailCapFor(profile: QualityProfile): number {
  if (profile.tier === 'high') return 48;
  if (profile.tier === 'medium') return 28;
  return 12;
}

const LENGTH = 7;
/** Snout sits this far ahead of the pivot so turns swing around the whale's middle. */
const HEAD = 2.6;
const SWIM_RATE = 1.25;
const SWIM_K = 3.6;
const EYE = new THREE.Vector3(0.69, -0.06, HEAD - 1.1);

function bodyRadius(u: number): number {
  if (u <= 0.3) {
    const a = (0.3 - u) / 0.3;
    return 0.95 * Math.sqrt(Math.max(0, 1 - a * a)) * (0.6 + 0.4 * (u / 0.3));
  }
  const k = (u - 0.3) / 0.7;
  return 0.1 + 0.85 * Math.pow(Math.cos((k * Math.PI) / 2), 1.25);
}

/** Vertical undulation, mirrored from the vertex shader so the stardust leaves from the moving flukes. */
function swimOffset(s: number, time: number): number {
  return (0.04 + 0.55 * Math.pow(s, 2.6)) * Math.sin(time * SWIM_RATE - s * SWIM_K);
}

function withFin(geometry: THREE.BufferGeometry, span: number): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position');
  const fin = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i += 1) fin[i] = span > 0 ? Math.min(1, Math.abs(pos.getX(i)) / span) : 0;
  geometry.setAttribute('aFin', new THREE.BufferAttribute(fin, 1));
  geometry.deleteAttribute('uv');
  return geometry;
}

function buildWhaleGeometry(): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [];
  const rings = 56;
  for (let i = 0; i <= rings; i += 1) {
    const u = i / rings;
    profile.push(new THREE.Vector2(Math.max(bodyRadius(u), 0.0005), u * LENGTH));
  }
  profile.push(new THREE.Vector2(0.0005, LENGTH));
  let body: THREE.BufferGeometry = new THREE.LatheGeometry(profile, 40);
  body.rotateX(-Math.PI / 2);
  const pos = body.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    // slightly flattened back, fuller throat
    pos.setXYZ(i, pos.getX(i) * 1.08, y * (y < 0 ? 0.9 : 0.76), pos.getZ(i) + HEAD);
  }
  body.deleteAttribute('uv');
  body.deleteAttribute('normal');
  body = mergeVertices(body, 1e-4);
  body.computeVertexNormals();
  body = withFin(body, 0);

  const fluke = new THREE.Shape();
  fluke.moveTo(0, -0.2);
  fluke.bezierCurveTo(0.6, -0.05, 1.3, 0.3, 1.8, 0.95);
  fluke.bezierCurveTo(1.4, 0.98, 0.8, 0.82, 0.24, 1.06);
  fluke.quadraticCurveTo(0.08, 0.92, 0, 0.84);
  fluke.quadraticCurveTo(-0.08, 0.92, -0.24, 1.06);
  fluke.bezierCurveTo(-0.8, 0.82, -1.4, 0.98, -1.8, 0.95);
  fluke.bezierCurveTo(-1.3, 0.3, -0.6, -0.05, 0, -0.2);
  const flukeGeometry = withFin(new THREE.ShapeGeometry(fluke, 20), 0);
  flukeGeometry.rotateX(-Math.PI / 2);
  flukeGeometry.translate(0, 0, HEAD - LENGTH * 0.95);

  const finShape = new THREE.Shape();
  finShape.moveTo(0, -0.05);
  finShape.bezierCurveTo(0.8, -0.1, 1.8, 0.2, 2.4, 0.78);
  finShape.bezierCurveTo(2.25, 0.98, 1.2, 0.72, 0, 0.6);
  finShape.lineTo(0, -0.05);
  const fins = [1, -1].map((side) => {
    const fin = withFin(new THREE.ShapeGeometry(finShape, 16), 2.4);
    fin.rotateX(-Math.PI / 2);
    fin.rotateZ(-0.55);
    fin.rotateY(0.32);
    if (side < 0) fin.scale(-1, 1, 1);
    fin.translate(side * 0.74, -0.38, HEAD - 2.0);
    return fin;
  });

  const merged = mergeGeometries([body, flukeGeometry, ...fins]);
  [body, flukeGeometry, ...fins].forEach((g) => g.dispose());
  return merged ?? body;
}

export class DragonController {
  readonly group = new THREE.Group();
  private readonly whale: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly trail: THREE.Points;
  private readonly trailPositions: Float32Array;
  private readonly trailColors: Float32Array;
  private readonly trailAges: Float32Array;
  private trailHead = 0;
  private spawnClock = 0;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly trailCap: number;
  private mode: DragonMode = 'lead';
  private placed = false;
  private readonly target = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly tail = new THREE.Vector3();
  private readonly textures: THREE.Texture[] = [];
  // start mid-glide so the hero frame opens with the whale crossing toward the moon
  private time = 2;

  constructor(scene: THREE.Scene, profile: QualityProfile) {
    this.trailCap = trailCapFor(profile);
    this.group.name = 'moon-whale-companion';

    this.material = this.keepMaterial(new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uLen: { value: LENGTH },
          uHead: { value: HEAD },
          uBack: { value: new THREE.Color(0x10223b) },
          uBelly: { value: new THREE.Color(0x8ea6c8) },
          uRim: { value: new THREE.Color(0xa9ccff) },
          uGlowA: { value: new THREE.Color(0x8fe6ff) },
          uGlowB: { value: new THREE.Color(0xc3a8ff) },
          uMoon: { value: MOON_DIR.clone() },
          uEye: { value: EYE.clone() },
        },
      ]),
      vertexShader: /* glsl */ `
        uniform float uTime, uLen, uHead;
        attribute float aFin;
        varying vec3 vObj, vObjN, vWN, vVN, vView;
        varying float vS, vFin;
        void main() {
          vec3 p = position;
          float s = clamp((uHead - p.z) / uLen, 0., 1.3);
          p.y += (.04 + .55 * pow(s, 2.6)) * sin(uTime * ${SWIM_RATE.toFixed(2)} - s * ${SWIM_K.toFixed(2)});
          p.y += aFin * aFin * sin(uTime * ${SWIM_RATE.toFixed(2)} + 1.2) * .35;
          vObj = position;
          vObjN = normal;
          vS = s;
          vFin = aFin;
          vWN = normalize(mat3(modelMatrix) * normal);
          vVN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uBack, uBelly, uRim, uGlowA, uGlowB, uMoon, uEye, fogColor;
        uniform float uTime, uHead, fogDensity;
        varying vec3 vObj, vObjN, vWN, vVN, vView;
        varying float vS, vFin;
        ${NOISE_GLSL}
        void main() {
          vec3 n = normalize(vWN);
          vec3 on = normalize(vObjN);
          vec3 vn = normalize(vVN);
          if (!gl_FrontFacing) { n = -n; on = -on; vn = -vn; }
          vec3 v = normalize(vView);
          float body = step(vFin, .001) * step(vS, .94);

          float dorsal = smoothstep(-.45, .35, on.y);
          vec3 col = mix(uBelly, uBack, dorsal);

          // ventral pleats along the throat and belly
          float ang = atan(vObj.x, -vObj.y);
          float pleat = smoothstep(.55, 1., sin(ang * 30.)) * (1. - dorsal) * smoothstep(.03, .09, vS) * smoothstep(.52, .3, vS);
          col += uBelly * pleat * body * .4;

          // moonlight from behind the gate, plus a cool sheen across the back
          float lit = max(dot(n, uMoon), 0.);
          col *= .5 + lit * .9;
          col += uRim * pow(max(on.y, 0.), 3.) * .07;

          // jaw line and a softly lit eye
          float jawY = -.1 - .12 * clamp((uHead - vObj.z) / 1.45, 0., 1.);
          float jaw = smoothstep(.035, .0, abs(vObj.y - jawY)) * step(uHead - 1.45, vObj.z) * body;
          col *= 1. - jaw * .65;
          float eye = smoothstep(.09, .05, length(vec3(abs(vObj.x), vObj.y, vObj.z) - uEye)) * body;
          col = mix(col, vec3(.85, .93, 1.) * 1.5, eye);

          // bioluminescent lights along the flanks, pulsing from head to tail
          vec2 g = vec2(vS * 46., ang * 3.2);
          vec2 cell = floor(g);
          float h = hash12(cell);
          float flank = smoothstep(.75, .3, abs(on.y));
          float spot = smoothstep(.3, .08, length(fract(g) - .5)) * step(.62, h) * flank * body * smoothstep(.06, .12, vS);
          float pulse = .55 + .45 * sin(uTime * 1.8 - vS * 14. + h * 6.);
          col += mix(uGlowA, uGlowB, step(.86, h)) * spot * pulse * 1.9;

          // glowing trailing edges on fins and flukes
          float edge = (1. - body) * smoothstep(.4, 1., max(vFin, smoothstep(.95, 1.1, vS)));
          col += uGlowA * edge * .35;

          // silver rim
          float fres = pow(1. - abs(dot(vn, v)), 2.2);
          col += uRim * fres * (.6 + .2 * sin(uTime * .7));

          float d = length(vView);
          float fogF = 1. - exp(-fogDensity * fogDensity * d * d * .25);
          col = mix(col, fogColor, clamp(fogF, 0., 1.));
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    this.whale = new THREE.Mesh(this.keepGeometry(buildWhaleGeometry()), this.material);
    this.whale.frustumCulled = false;
    this.group.add(this.whale);

    // Stardust shed from the flukes, kept in world space so it lingers along the glide path.
    this.trailPositions = new Float32Array(this.trailCap * 3);
    this.trailColors = new Float32Array(this.trailCap * 3);
    this.trailAges = new Float32Array(this.trailCap).fill(1e3);
    const trailGeometry = this.keepGeometry(new THREE.BufferGeometry());
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    this.trail = new THREE.Points(trailGeometry, this.keepMaterial(new THREE.PointsMaterial({
      map: this.keepTexture(softDot()),
      vertexColors: true,
      size: 0.42,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })));
    this.trail.frustumCulled = false;
    this.trail.name = 'moon-whale-stardust';
    scene.add(this.group, this.trail);
  }

  setMode(mode: DragonMode, _frame: WorldFrame): void {
    this.mode = mode;
  }

  update(delta: number, frame: WorldFrame): void {
    const dt = Math.min(0.05, Math.max(0, delta));
    this.time += dt;
    if (frame.dragonMode !== this.mode) this.setMode(frame.dragonMode, frame);
    const pose = sampleDragonPose(this.mode, this.time * 0.03);
    // a whale changes course slowly: glide between behaviours instead of snapping
    const follow = this.placed ? 1 - Math.exp(-0.9 * dt) : 1;
    this.placed = true;
    this.target.set(pose.position.x, pose.position.y, pose.position.z);
    this.group.position.lerp(this.target, follow);
    this.look.lerp(this.lookTarget.set(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z).sub(this.target).add(this.group.position), this.placed ? Math.max(follow, 0.08) : 1);
    this.group.lookAt(this.look);
    this.group.rotateZ(pose.roll);
    this.group.updateMatrixWorld();
    this.material.uniforms.uTime.value = this.time;

    this.spawnClock += dt;
    while (this.spawnClock > 0.09) {
      this.spawnClock -= 0.09;
      const s = 1.02;
      this.tail.set((Math.random() - 0.5) * 2.6, swimOffset(s, this.time) + (Math.random() - 0.5) * 0.3, HEAD - LENGTH * s);
      this.group.localToWorld(this.tail);
      this.trailPositions.set([this.tail.x, this.tail.y, this.tail.z], this.trailHead * 3);
      this.trailAges[this.trailHead] = 0;
      this.trailHead = (this.trailHead + 1) % this.trailCap;
    }
    const life = this.trailCap * 0.09;
    for (let i = 0; i < this.trailCap; i += 1) {
      this.trailAges[i] += dt;
      const fade = Math.max(0, 1 - this.trailAges[i] / life);
      const twinkle = fade * fade * (0.7 + 0.3 * Math.sin(this.time * 6 + i));
      this.trailPositions[i * 3 + 1] += dt * 0.12;
      this.trailColors.set([0.72 * twinkle, 0.88 * twinkle, 1 * twinkle], i * 3);
    }
    this.trail.geometry.getAttribute('position').needsUpdate = true;
    this.trail.geometry.getAttribute('color').needsUpdate = true;
  }

  getTrailCount(): number {
    return this.trailCap;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.trail.removeFromParent();
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
