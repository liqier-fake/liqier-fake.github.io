import * as THREE from 'three';
import { Kit, NOISE_GLSL, PALETTE, glowTexture, seeded } from './kit';

/** Direction toward the moon. The hero frame places it just above and right of the gate. */
export const MOON_DIR = new THREE.Vector3(0.17, 0.2, -1).normalize();

export interface SkyRig {
  /** Follows the camera so sky, stars and moon read as infinitely distant. */
  dome: THREE.Group;
  update(camera: THREE.Camera, elapsed: number): void;
}

export function createSky(kit: Kit, scene: THREE.Scene, starCount: number): SkyRig {
  const dome = new THREE.Group();
  dome.name = 'sky-dome';
  dome.renderOrder = -10;

  const skyMaterial = kit.keep(new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: PALETTE.zenith },
      uSky: { value: PALETTE.sky },
      uHorizon: { value: PALETTE.horizon },
      uSilver: { value: PALETTE.silver },
      uViolet: { value: PALETTE.violet },
      uMoon: { value: MOON_DIR },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith, uSky, uHorizon, uSilver, uViolet, uMoon;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uSky, smoothstep(-.02, .28, h));
        col = mix(col, uZenith, smoothstep(.25, .95, h));
        col = mix(col, uHorizon * .55, smoothstep(0., -.2, h));
        float m = max(dot(d, uMoon), 0.);
        col += uSilver * (pow(m, 9.) * .16 + pow(m, 60.) * .32);
        // faint violet haze over the distant city, low on the left horizon
        float city = exp(-abs(h - .02) * 16.) * smoothstep(.1, -.55, d.x) * smoothstep(-1., -.2, d.z);
        col += uViolet * city * .22;
        // thin cloud banks catching moonlight
        vec2 cp = d.xz / max(h + .18, .05) * 1.6;
        float cloud = smoothstep(.55, .85, fbm(cp + vec2(0., 3.)));
        col = mix(col, col + uSilver * .05 + uHorizon * .25, cloud * smoothstep(.02, .2, h) * smoothstep(.7, .3, h) * (.4 + m));
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const sky = new THREE.Mesh(kit.keep(new THREE.SphereGeometry(300, 48, 24)), skyMaterial);
  sky.renderOrder = -10;
  dome.add(sky);

  // Stars: fixed on the dome, twinkling, fading toward the horizon haze.
  const rnd = seeded(7);
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i += 1) {
    const u = rnd() * Math.PI * 2;
    const y = 0.04 + Math.pow(rnd(), 0.8) * 0.96;
    const r = Math.sqrt(1 - y * y);
    positions.set([Math.cos(u) * r * 280, y * 280, Math.sin(u) * r * 280], i * 3);
    sizes[i] = 0.6 + Math.pow(rnd(), 6) * 3.2;
  }
  const starGeometry = kit.keep(new THREE.BufferGeometry());
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const starMaterial = kit.keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      uniform float uTime, uPx;
      varying float vA;
      void main() {
        float tw = .65 + .35 * sin(uTime * (1.2 + fract(position.x * 7.1) * 2.5) + position.z);
        vA = tw * smoothstep(10., 70., position.y);
        gl_PointSize = aSize * uPx;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, .0, d) * vA;
        gl_FragColor = vec4(vec3(.86, .92, 1.) * a, a);
      }`,
  }));
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.renderOrder = -9;
  dome.add(stars);

  // Moon: a billboarded disc with procedural maria, plus a wide additive halo.
  const moonGroup = new THREE.Group();
  moonGroup.position.copy(MOON_DIR).multiplyScalar(250);
  const moonMaterial = kit.keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { uSilver: { value: PALETTE.silver } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSilver;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        float r = length(vUv);
        float disc = smoothstep(1., .975, r);
        if (disc <= 0.) discard;
        vec3 n = vec3(vUv, sqrt(max(0., 1. - r * r)));
        float lit = clamp(dot(n, normalize(vec3(-.35, .3, .9))) * .55 + .55, 0., 1.);
        float maria = smoothstep(.42, .7, fbm(vUv * 1.7 + vec2(4.2, 1.3)));
        float craters = fbm(vUv * 9.) * .18;
        vec3 col = uSilver * (1.12 - maria * .3 - craters) * lit;
        col *= mix(vec3(1.), vec3(1.05, 1., .93), .5);
        gl_FragColor = vec4(col * 1.35, disc);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  const moon = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(26, 26)), moonMaterial);
  moon.renderOrder = -7;
  const halo = new THREE.Mesh(
    kit.keep(new THREE.PlaneGeometry(150, 150)),
    kit.keep(new THREE.MeshBasicMaterial({
      map: glowTexture(kit, 256),
      color: new THREE.Color(0x8fb4d8),
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })),
  );
  halo.renderOrder = -8;
  moonGroup.add(halo, moon);
  dome.add(moonGroup);

  scene.add(dome);

  return {
    dome,
    update(camera, elapsed) {
      dome.position.copy(camera.position);
      moonGroup.quaternion.copy(camera.quaternion);
      starMaterial.uniforms.uTime.value = elapsed;
    },
  };
}

/** Layered mountain silhouettes with a valley that frames the gate and moon. */
export function createRidges(kit: Kit, scene: THREE.Scene): void {
  const layers = [
    { z: -112, height: 15, valley: 52, seed: 3, tone: 0.22 },
    { z: -150, height: 26, valley: 70, seed: 11, tone: 0.42 },
    { z: -205, height: 38, valley: 96, seed: 19, tone: 0.62 },
  ];
  const ridgeDark = new THREE.Color(0x040a12);
  layers.forEach((layer) => {
    const rnd = seeded(layer.seed);
    const shape = new THREE.Shape();
    const width = 420;
    const steps = 140;
    shape.moveTo(-width / 2, -6);
    let drift = 0;
    for (let i = 0; i <= steps; i += 1) {
      const x = -width / 2 + (i / steps) * width;
      drift += (rnd() - 0.5) * 0.9;
      drift *= 0.94;
      const big = Math.sin(x * 0.021 + layer.seed) * 0.5 + Math.sin(x * 0.047 + layer.seed * 2.1) * 0.3;
      const gap = 1 - Math.exp(-(((x + 8) / layer.valley) ** 2)) * 0.86;
      const y = Math.max(0.4, (layer.height * (0.62 + big * 0.42) + drift * 3) * gap);
      shape.lineTo(x, y);
    }
    shape.lineTo(width / 2, -6);
    shape.closePath();
    const geometry = kit.keep(new THREE.ShapeGeometry(shape));
    const top = ridgeDark.clone().lerp(PALETTE.horizon, layer.tone * 0.9);
    const bottom = ridgeDark.clone().lerp(PALETTE.fog, layer.tone);
    const colors: number[] = [];
    const pos = geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += 1) {
      const t = THREE.MathUtils.clamp(pos.getY(i) / layer.height, 0, 1);
      const c = bottom.clone().lerp(top, t);
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geometry, kit.keep(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })));
    mesh.position.set(0, -0.6, layer.z);
    mesh.renderOrder = -6;
    scene.add(mesh);
  });
}

/** A distant luminous city on the left horizon: instanced towers with lit windows. */
export function createCity(kit: Kit, scene: THREE.Scene): THREE.Vector3[] {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rnd = seeded(23);
  if (ctx) {
    ctx.fillStyle = '#060c1a';
    ctx.fillRect(0, 0, 64, 256);
    for (let y = 4; y < 256; y += 6) {
      for (let x = 4; x < 64; x += 6) {
        const r = rnd();
        if (r > 0.8) {
          ctx.fillStyle = r > 0.96 ? '#f1a65a' : r > 0.86 ? '#9a7cff' : '#6f9fd6';
          ctx.globalAlpha = 0.25 + rnd() * 0.5;
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }
  }
  const windows = kit.keep(new THREE.CanvasTexture(canvas));
  windows.colorSpace = THREE.SRGBColorSpace;
  const material = kit.keep(new THREE.MeshBasicMaterial({ map: windows, color: new THREE.Color(0x9fb6d6), fog: false }));
  const count = 70;
  const towers = new THREE.InstancedMesh(kit.keep(new THREE.BoxGeometry(1, 1, 1)), material, count);
  const m = new THREE.Matrix4();
  const beacons: THREE.Vector3[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = -118 + rnd() * 92;
    const z = -128 - rnd() * 26;
    const h = 2.5 + Math.pow(rnd(), 2.4) * 15;
    const w = 1.6 + rnd() * 3.4;
    m.compose(new THREE.Vector3(x, h / 2 - 0.6, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w * (0.8 + rnd() * 0.6)));
    towers.setMatrixAt(i, m);
    if (h > 11) beacons.push(new THREE.Vector3(x, h + 0.4, z));
  }
  towers.renderOrder = -5;
  scene.add(towers);
  return beacons;
}
