import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit, NOISE_GLSL, PALETTE, seeded } from './kit';
import type { GlowSpec } from './glow';

interface TreeOptions {
  at: THREE.Vector3;
  height: number;
  seed: number;
  blossoms: number;
  tint: THREE.Color;
  glow: number;
  lean?: number;
}

interface Tree {
  wood: THREE.BufferGeometry;
  blossomPositions: number[];
  blossomColors: number[];
  tips: THREE.Vector3[];
}

function growTree(options: TreeOptions): Tree {
  const rnd = seeded(options.seed);
  const pieces: THREE.BufferGeometry[] = [];
  const tips: THREE.Vector3[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const branch = (from: THREE.Vector3, dir: THREE.Vector3, length: number, radius: number, depth: number) => {
    const to = from.clone().addScaledVector(dir, length);
    const piece = new THREE.CylinderGeometry(radius * 0.68, radius, length, 6, 1, true);
    piece.translate(0, length / 2, 0);
    piece.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
    piece.translate(from.x, from.y, from.z);
    pieces.push(piece.toNonIndexed());
    piece.dispose();
    if (depth === 0 || radius < 0.03) {
      tips.push(to);
      return;
    }
    const children = depth > 2 ? 2 : 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < children; i += 1) {
      const next = dir.clone()
        .add(new THREE.Vector3((rnd() - 0.5) * 1.5, (rnd() - 0.2) * 0.7, (rnd() - 0.5) * 1.5))
        .normalize();
      branch(to, next, length * (0.62 + rnd() * 0.18), radius * 0.66, depth - 1);
    }
  };
  const trunkDir = new THREE.Vector3(options.lean ?? 0.15, 1, 0.05).normalize();
  branch(options.at.clone(), trunkDir, options.height * 0.36, options.height * 0.045, 5);

  const blossomPositions: number[] = [];
  const blossomColors: number[] = [];
  const per = Math.max(1, Math.floor((options.blossoms * 1.5) / tips.length));
  tips.forEach((tip) => {
    for (let i = 0; i < per; i += 1) {
      const r = Math.pow(rnd(), 0.6) * options.height * 0.13;
      const a = rnd() * Math.PI * 2;
      const b = Math.acos(2 * rnd() - 1);
      blossomPositions.push(tip.x + Math.sin(b) * Math.cos(a) * r, tip.y + Math.cos(b) * r * 0.7 - r * 0.2, tip.z + Math.sin(b) * Math.sin(a) * r);
      const c = options.tint.clone().offsetHSL(0, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.16);
      blossomColors.push(c.r * options.glow, c.g * options.glow, c.b * options.glow);
    }
  });
  return { wood: mergeGeometries(pieces), blossomPositions, blossomColors, tips };
}

export interface Flora {
  glows: GlowSpec[];
  update(elapsed: number, camera: THREE.Camera): void;
}

export function createFlora(kit: Kit, scene: THREE.Scene, particleBudget: number, pxScale: { value: number }): Flora {
  const rnd = seeded(77);
  const trees: Tree[] = [
    growTree({ at: new THREE.Vector3(-9.5, 0.4, 3), height: 9, seed: 2, blossoms: 900, tint: PALETTE.blossom, glow: 0.5, lean: 0.35 }),
    growTree({ at: new THREE.Vector3(9.2, 0.4, -3), height: 8, seed: 5, blossoms: 800, tint: PALETTE.blossom, glow: 0.48, lean: -0.3 }),
    growTree({ at: new THREE.Vector3(14.5, 0.4, -25), height: 7, seed: 8, blossoms: 600, tint: PALETTE.blossom, glow: 0.45, lean: -0.2 }),
    growTree({ at: new THREE.Vector3(-14, 0.4, -12), height: 8, seed: 13, blossoms: 600, tint: PALETTE.blossom, glow: 0.42, lean: 0.25 }),
  ];
  // The moon tree: larger, silver-white, holding the collected plaques.
  const moonTree = growTree({ at: new THREE.Vector3(-5.5, 0.4, -48), height: 13, seed: 31, blossoms: 1700, tint: new THREE.Color(0xc9d8f5), glow: 0.62, lean: 0.05 });
  trees.push(moonTree);

  const bark = kit.keep(new THREE.MeshStandardMaterial({ color: 0x130d0f, roughness: 0.9 }));
  const islandMaterial = kit.keep(new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 1 }));
  const islandGeometry = kit.keep(new THREE.DodecahedronGeometry(1, 1));
  trees.forEach((tree, i) => {
    kit.keep(tree.wood);
    const wood = new THREE.Mesh(tree.wood, bark);
    wood.castShadow = true;
    scene.add(wood);
    const root = [[-9.5, 3], [9.2, -3], [14.5, -25], [-14, -12], [-5.5, -48]][i];
    const island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.scale.set(i === 4 ? 4.2 : 2.6, 0.7, i === 4 ? 3.6 : 2.2);
    island.position.set(root[0], 0.05, root[1]);
    island.receiveShadow = true;
    scene.add(island);
  });

  const positions = trees.flatMap((t) => t.blossomPositions);
  const colors = trees.flatMap((t) => t.blossomColors);
  const blossomGeometry = kit.keep(new THREE.BufferGeometry());
  blossomGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  blossomGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const blossomMaterial = kit.keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 400 } }]),
    vertexShader: /* glsl */ `
      uniform float uTime, uScale;
      varying vec3 vColor;
      #include <fog_pars_vertex>
      void main() {
        vColor = color;
        vec3 p = position;
        p.x += sin(uTime * .8 + p.y * 1.7) * .04;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = .28 * uScale / max(-mvPosition.z, .1);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      #include <fog_pars_fragment>
      void main() {
        float d = length(gl_PointCoord - .5) * 2.;
        float a = smoothstep(1., .15, d) * .7;
        gl_FragColor = vec4(vColor * (1.1 - d * .4), a);
        #include <fog_fragment>
      }`,
  }));
  scene.add(new THREE.Points(blossomGeometry, blossomMaterial));

  // Plaques hanging from the moon tree — the collection's world object.
  const plaqueMaterial = kit.keep(new THREE.MeshStandardMaterial({ color: 0xf6dfb8, emissive: 0xf1a65a, emissiveIntensity: 0.7, side: THREE.DoubleSide }));
  const cordMaterial = kit.keep(new THREE.LineBasicMaterial({ color: 0x8b6a5a, transparent: true, opacity: 0.6 }));
  const plaqueGeometry = kit.keep(new THREE.PlaneGeometry(0.32, 0.5));
  const glows: GlowSpec[] = [];
  const plaques: THREE.Mesh[] = [];
  moonTree.tips.filter((tip) => tip.y > 6).slice(0, 16).forEach((tip, i) => {
    const drop = 0.8 + rnd() * 1.4;
    const plaque = new THREE.Mesh(plaqueGeometry, plaqueMaterial);
    plaque.position.set(tip.x, tip.y - drop, tip.z);
    plaque.rotation.y = rnd() * Math.PI;
    plaque.userData.phase = i;
    plaques.push(plaque);
    const cord = new THREE.Line(
      kit.keep(new THREE.BufferGeometry().setFromPoints([tip, new THREE.Vector3(tip.x, tip.y - drop + 0.25, tip.z)])),
      cordMaterial,
    );
    scene.add(plaque, cord);
    glows.push({ position: plaque.position.clone(), color: new THREE.Color(0xd99a5c), size: 0.9, flicker: i * 0.6 });
  });
  glows.push({ position: new THREE.Vector3(-5.5, 7.5, -48), color: new THREE.Color(0x3c4f80), size: 18 });

  // Falling petals around the whole route.
  const petalCount = Math.floor(particleBudget * 0.55);
  const seeds = new Float32Array(petalCount * 4);
  for (let i = 0; i < petalCount; i += 1) seeds.set([(rnd() - 0.5) * 44, rnd() * 14, 22 - rnd() * 80, rnd() * 100], i * 4);
  const petalGeometry = kit.keep(new THREE.BufferGeometry());
  petalGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(petalCount * 3), 3));
  petalGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const petalMaterial = kit.keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uScale: pxScale, uColor: { value: PALETTE.blossom } },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime, uScale;
      varying float vAngle, vA;
      void main() {
        float t = uTime + aSeed.w;
        vec3 p = vec3(aSeed.x, mod(aSeed.y - t * .55, 14.), aSeed.z);
        p.x += sin(t * .7 + aSeed.w) * .9 + mod(t * .35, 6.) - 3.;
        p.z += cos(t * .5 + aSeed.w * 2.) * .6;
        vAngle = t * 1.7 + aSeed.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vA = smoothstep(0., 1.2, p.y) * smoothstep(14., 12., p.y) * exp(-max(-mv.z - 12., 0.) * .05);
        gl_PointSize = .2 * uScale / max(-mv.z, .1);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAngle, vA;
      void main() {
        vec2 q = gl_PointCoord - .5;
        float c = cos(vAngle), s = sin(vAngle);
        q = mat2(c, -s, s, c) * q;
        q.x *= 1.9 + .9 * sin(vAngle * .7);
        float a = smoothstep(.5, .3, length(q)) * vA * .85;
        gl_FragColor = vec4(uColor * .8, a);
      }`,
  }));
  const petals = new THREE.Points(petalGeometry, petalMaterial);
  petals.frustumCulled = false;
  scene.add(petals);

  // Fireflies and moon dust hovering over the water.
  const motes = Math.floor(particleBudget * 0.45);
  const moteSeeds = new Float32Array(motes * 4);
  for (let i = 0; i < motes; i += 1) moteSeeds.set([(rnd() - 0.5) * 60, 0.3 + Math.pow(rnd(), 2) * 9, 24 - rnd() * 84, rnd() * 100], i * 4);
  const moteGeometry = kit.keep(new THREE.BufferGeometry());
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(motes * 3), 3));
  moteGeometry.setAttribute('aSeed', new THREE.BufferAttribute(moteSeeds, 4));
  const moteMaterial = kit.keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: pxScale, uWarm: { value: PALETTE.amber }, uCool: { value: PALETTE.silver } },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime, uScale;
      varying float vA, vWarm;
      void main() {
        float t = uTime * .25 + aSeed.w;
        vec3 p = aSeed.xyz + vec3(sin(t * 1.3) * 1.2, sin(t * 2.1) * .35, cos(t * .9) * 1.2);
        vWarm = step(.72, fract(aSeed.w * 3.7));
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vA = (.5 + .5 * sin(uTime * (1. + fract(aSeed.w) * 2.) + aSeed.w * 9.)) * exp(-max(-mv.z - 15., 0.) * .04);
        gl_PointSize = (vWarm > .5 ? .16 : .07) * uScale / max(-mv.z, .1);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uWarm, uCool;
      varying float vA, vWarm;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.;
        float a = exp(-d * d * 5.) * vA;
        gl_FragColor = vec4(mix(uCool, uWarm, vWarm) * a * 1.4, a);
      }`,
  }));
  const motesPoints = new THREE.Points(moteGeometry, moteMaterial);
  motesPoints.frustumCulled = false;
  scene.add(motesPoints);

  // Low drifting mist over the water.
  const mistMaterial = kit.keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x5f7fa6) }, uOpacity: { value: 0.28 } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity; uniform vec3 uColor; varying vec3 vWorld;
      ${NOISE_GLSL}
      void main(){
        vec2 p = vWorld.xz * .045 + vec2(uTime * .012, uTime * .004);
        float n = fbm(p + fbm(p * 1.7 - uTime * .01));
        float d = length(vWorld - cameraPosition);
        float a = smoothstep(.42, .85, n) * uOpacity * smoothstep(3., 14., d) * smoothstep(160., 60., d);
        gl_FragColor = vec4(uColor, a);
      }`,
  }));
  const mistGeometry = kit.keep(new THREE.PlaneGeometry(220, 220));
  [0.35, 0.9, 1.6].forEach((y, i) => {
    const mist = new THREE.Mesh(mistGeometry, mistMaterial);
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(i * 7, y, -30);
    mist.renderOrder = 2;
    scene.add(mist);
  });

  return {
    glows,
    update(elapsed) {
      blossomMaterial.uniforms.uTime.value = elapsed;
      blossomMaterial.uniforms.uScale.value = pxScale.value;
      petalMaterial.uniforms.uTime.value = elapsed;
      moteMaterial.uniforms.uTime.value = elapsed;
      mistMaterial.uniforms.uTime.value = elapsed;
      plaques.forEach((plaque) => { plaque.rotation.z = Math.sin(elapsed * 0.9 + plaque.userData.phase) * 0.12; });
    },
  };
}
