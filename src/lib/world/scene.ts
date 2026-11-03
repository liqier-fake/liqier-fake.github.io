import * as THREE from 'three';
import type { QualityProfile } from './quality';
import type { WorldFrame } from './timeline';
import { DragonController } from './dragon';
import { Kit, PALETTE } from './parts/kit';
import { MOON_DIR, createCity, createRidges, createSky } from './parts/sky';
import { createWater } from './parts/water';
import { createArchitecture } from './parts/architecture';
import { createFlora } from './parts/flora';
import { createGlows, type GlowSpec } from './parts/glow';

export interface WorldScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** World-space anchors for each content entrance, projected onto the DOM layer. */
  anchors: ReadonlyMap<string, THREE.Vector3>;
  resize(width: number, height: number): void;
  setPointer(x: number, y: number): void;
  update(frame: WorldFrame, elapsed: number, delta: number): void;
  dispose(): void;
}

interface Waypoint { p: [number, number, number]; t: [number, number, number]; fov: number; }

/** Authored camera stations, one per chapter of the page. */
const WAYPOINTS: Waypoint[] = [
  { p: [0, 1.55, 19], t: [0, 5.4, -60], fov: 40 }, // arrival: low over the sea, gate and moon ahead
  { p: [-5.6, 3.0, 6], t: [0.8, 5.4, -16], fov: 46 }, // beside the lantern rows, looking up at the gate
  { p: [1.5, 2.7, -20], t: [11, 3, -33], fov: 48 }, // just through the gate, the lit pavilion ahead
  { p: [-2.5, 3.2, -24], t: [-10, 3.6, -36], fov: 50 }, // turning to the glass corridor and the moon tree
  { p: [0, 9.2, -4.5], t: [0, 0.6, -36], fov: 54 }, // the overlook where every entrance is visible
];

/** cameraT → waypoint index; lets each chapter rest on its station instead of drifting past it. */
const STATION_KEYS: Array<[number, number]> = [[0, 0], [0.28, 1], [0.5, 2], [0.69, 3], [0.93, 4], [1, 4]];

export const ENTRANCE_ANCHORS: Record<string, [number, number, number]> = {
  'paper-slip:first-light': [3.8, 1.6, -26],
  'essay-pavilion:after-the-long-night': [10.5, 4.6, -32],
  'image-corridor:moonlit-water': [-10, 4.7, -30],
  'moon-tree:borrowed-light': [-5.5, 7.4, -48],
  'central-platform:about': [0, 1.1, -13.5],
};

function stationAt(cameraT: number): number {
  for (let i = 1; i < STATION_KEYS.length; i += 1) {
    const [t1, s1] = STATION_KEYS[i];
    const [t0, s0] = STATION_KEYS[i - 1];
    if (cameraT <= t1) return s0 + ((cameraT - t0) / Math.max(t1 - t0, 1e-6)) * (s1 - s0);
  }
  return WAYPOINTS.length - 1;
}

const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

export function createWorldScene(profile: QualityProfile, reducedMotion = false): WorldScene {
  const kit = new Kit();
  const scene = new THREE.Scene();
  scene.background = PALETTE.sky.clone();
  scene.fog = new THREE.FogExp2(PALETTE.fog, 0.03);

  const camera = new THREE.PerspectiveCamera(WAYPOINTS[0].fov, 1, 0.1, 520);
  const pxScale = { value: 400 };

  const sky = createSky(kit, scene, profile.tier === 'low' ? 500 : 1400);
  createRidges(kit, scene);
  const beacons = createCity(kit, scene);
  const architecture = createArchitecture(kit, scene);
  const water = createWater(kit, scene, architecture.lanternLights, profile.reflections);
  const flora = createFlora(kit, scene, profile.particleCount, pxScale);

  const glowSpecs: GlowSpec[] = [
    ...architecture.glows,
    ...flora.glows,
    ...beacons.map((p, i) => ({ position: p, color: i % 3 === 0 ? PALETTE.amber.clone() : PALETTE.violet.clone(), size: 4, flicker: i * 0.9 })),
  ];
  const glows = createGlows(kit, scene, glowSpecs, 'world-glows');

  const hemi = new THREE.HemisphereLight(0x6f93c4, 0x05080d, 0.9);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xc9dcf2, 1.7);
  moonLight.position.copy(MOON_DIR).multiplyScalar(60).add(new THREE.Vector3(0, 0, -20));
  moonLight.target.position.set(0, 0, -20);
  moonLight.castShadow = profile.shadows;
  if (profile.shadows) {
    moonLight.shadow.mapSize.set(2048, 2048);
    Object.assign(moonLight.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
    moonLight.shadow.bias = -0.0006;
  }
  scene.add(moonLight, moonLight.target);
  // A cool rim from behind so silhouettes separate from the sky.
  const rim = new THREE.DirectionalLight(0x7d8fe0, 0.6);
  rim.position.set(-20, 12, -60);
  scene.add(rim);
  const warmLights = [
    new THREE.PointLight(0xffa860, 3, 14, 2),
    new THREE.PointLight(0xffa860, 5, 16, 2),
    new THREE.PointLight(0xffb070, 2, 12, 2),
  ];
  warmLights[0].position.set(0, 2.2, -11);
  warmLights[1].position.set(10.5, 2.6, -32);
  warmLights[2].position.set(0, 2.4, 2);
  warmLights.forEach((light) => scene.add(light));

  const dragon = new DragonController(scene, profile);

  const posCurve = new THREE.CatmullRomCurve3(WAYPOINTS.map((w) => new THREE.Vector3(...w.p)), false, 'catmullrom', 0.4);
  const tgtCurve = new THREE.CatmullRomCurve3(WAYPOINTS.map((w) => new THREE.Vector3(...w.t)), false, 'catmullrom', 0.4);
  const anchors = new Map(Object.entries(ENTRANCE_ANCHORS).map(([id, p]) => [id, new THREE.Vector3(...p)]));

  const rig = { station: 0, mx: 0, my: 0, tmx: 0, tmy: 0, intro: 0, aspect: 1, height: 800, first: true };
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const dir = new THREE.Vector3();

  return {
    scene,
    camera,
    anchors,
    resize(width, height) {
      rig.aspect = width / Math.max(1, height);
      rig.height = height;
      camera.aspect = rig.aspect;
      camera.updateProjectionMatrix();
    },
    setPointer(x, y) {
      rig.tmx = x;
      rig.tmy = y;
    },
    update(frame, elapsed, delta) {
      const dt = Math.min(0.1, Math.max(0, delta));
      const targetStation = stationAt(frame.cameraT);
      if (rig.first || reducedMotion) {
        rig.station = targetStation;
        rig.first = false;
      } else {
        rig.station = damp(rig.station, targetStation, 3.4, dt);
      }
      rig.intro = reducedMotion ? 1 : Math.min(1, rig.intro + dt / 3.2);
      const sway = reducedMotion ? 0 : 1;
      rig.mx = damp(rig.mx, rig.tmx * sway, 2.2, dt);
      rig.my = damp(rig.my, rig.tmy * sway, 2.2, dt);

      const u = THREE.MathUtils.clamp(rig.station / (WAYPOINTS.length - 1), 0, 1);
      posCurve.getPoint(u, p);
      tgtCurve.getPoint(u, t);
      const i = Math.min(WAYPOINTS.length - 2, Math.floor(rig.station));
      const f = THREE.MathUtils.clamp(rig.station - i, 0, 1);
      let fov = THREE.MathUtils.lerp(WAYPOINTS[i].fov, WAYPOINTS[i + 1].fov, f);

      // Tall screens: step back along the view axis instead of cropping the gate in half.
      const narrow = THREE.MathUtils.clamp((1.55 - rig.aspect) / 1.0, 0, 1);
      if (narrow > 0) {
        dir.subVectors(p, t).normalize();
        p.addScaledVector(dir, narrow * 6);
        p.y += narrow * 0.8;
        fov *= 1 + narrow * 0.38;
      }
      // Opening dolly: a long lens easing in from further back.
      const ease = 1 - Math.pow(1 - rig.intro, 3);
      p.z += (1 - ease) * 7;
      p.y += (1 - ease) * 0.6;
      fov += (1 - ease) * 6;
      // Breathing and pointer parallax.
      p.x += rig.mx * 0.7 + Math.sin(elapsed * 0.21) * 0.08 * sway;
      p.y += -rig.my * 0.35 + Math.sin(elapsed * 0.33) * 0.05 * sway;
      t.x += rig.mx * 0.25;

      camera.position.copy(p);
      camera.lookAt(t);
      camera.fov = fov;
      camera.updateProjectionMatrix();

      pxScale.value = rig.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      glows.material.uniforms.uScale.value = pxScale.value;
      glows.material.uniforms.uTime.value = elapsed;

      if (scene.fog instanceof THREE.FogExp2) scene.fog.density = frame.fogDensity * 0.62;
      hemi.intensity = 0.55 + frame.worldLight * 0.5;
      moonLight.intensity = 1.1 + frame.worldLight * 0.9;
      warmLights.forEach((light, index) => { light.intensity = [3, 5, 2][index] * (0.92 + Math.sin(elapsed * 6 + index) * 0.05); });

      sky.update(camera, elapsed);
      water.update(elapsed);
      architecture.update(elapsed);
      flora.update(elapsed, camera);
      dragon.update(delta, frame);
    },
    dispose() {
      dragon.dispose();
      kit.dispose();
    },
  };
}
