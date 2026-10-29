import * as THREE from 'three';
import type { QualityProfile } from './quality';
import type { WorldFrame } from './timeline';
import { DragonController } from './dragon';

export interface WorldScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(frame: WorldFrame, elapsed: number, delta: number): void;
  dispose(): void;
}

const disposableMaterials: THREE.Material[] = [];
const disposableGeometries: THREE.BufferGeometry[] = [];

function material<T extends THREE.Material>(value: T): T {
  disposableMaterials.push(value);
  return value;
}

function geometry<T extends THREE.BufferGeometry>(value: T): T {
  disposableGeometries.push(value);
  return value;
}

function addGate(scene: THREE.Scene): void {
  const gate = new THREE.Group();
  const vermilion = material(new THREE.MeshStandardMaterial({ color: 0xc9493a, roughness: 0.54, metalness: 0.08 }));
  const darkRoof = material(new THREE.MeshStandardMaterial({ color: 0x170f15, roughness: 0.8 }));
  const post = geometry(new THREE.CylinderGeometry(0.34, 0.42, 8.2, 16));
  const beam = geometry(new THREE.BoxGeometry(10.8, 0.55, 0.7));
  for (const x of [-3.4, 3.4]) {
    const mesh = new THREE.Mesh(post, vermilion);
    mesh.position.set(x, 4.1, -16);
    mesh.castShadow = true;
    gate.add(mesh);
  }
  const upper = new THREE.Mesh(beam, vermilion);
  upper.position.set(0, 7.7, -16);
  gate.add(upper);
  const roof = new THREE.Mesh(geometry(new THREE.BoxGeometry(12.4, 0.28, 1.2)), darkRoof);
  roof.position.set(0, 8.25, -16);
  roof.rotation.z = -0.018;
  gate.add(roof);
  scene.add(gate);
}

function addLanternPath(scene: THREE.Scene): void {
  const wood = material(new THREE.MeshStandardMaterial({ color: 0x301e1a, roughness: 0.72 }));
  const glow = material(new THREE.MeshStandardMaterial({ color: 0xffc176, emissive: 0xf1a65a, emissiveIntensity: 2.4 }));
  const postGeo = geometry(new THREE.BoxGeometry(0.12, 1.15, 0.12));
  const lampGeo = geometry(new THREE.BoxGeometry(0.42, 0.62, 0.42));
  for (let i = 0; i < 24; i += 1) {
    const z = 8 - i * 2.25;
    for (const x of [-5.2, 5.2]) {
      const post = new THREE.Mesh(postGeo, wood);
      post.position.set(x, 0.52, z);
      const lamp = new THREE.Mesh(lampGeo, glow);
      lamp.position.set(x, 1.25, z);
      scene.add(post, lamp);
    }
  }
}

function addCity(scene: THREE.Scene): void {
  const city = new THREE.Group();
  const colors = [0x112b46, 0x18385a, 0x251f52, 0x0f2940];
  for (let i = 0; i < 54; i += 1) {
    const height = 2.5 + ((i * 17) % 9);
    const tower = new THREE.Mesh(
      geometry(new THREE.BoxGeometry(0.8 + (i % 3) * 0.35, height, 0.9)),
      material(new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        emissive: i % 5 === 0 ? 0x293a88 : 0x071425,
        emissiveIntensity: 0.55,
        roughness: 0.82,
      })),
    );
    const side = i % 2 === 0 ? -1 : 1;
    tower.position.set(side * (12 + (i % 11) * 1.8), height / 2 - 0.4, -26 - Math.floor(i / 11) * 6);
    city.add(tower);
  }
  scene.add(city);
}

function addParticles(scene: THREE.Scene, count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 62;
    positions[i * 3 + 1] = Math.random() * 18;
    positions[i * 3 + 2] = 10 - Math.random() * 70;
  }
  const pointsGeometry = geometry(new THREE.BufferGeometry());
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    pointsGeometry,
    material(new THREE.PointsMaterial({ color: 0xdce9f3, size: 0.055, transparent: true, opacity: 0.68, depthWrite: false })),
  );
  scene.add(points);
  return points;
}

export function createWorldScene(profile: QualityProfile): WorldScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071425);
  scene.fog = new THREE.FogExp2(0x071425, 0.045);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.35, 15),
    new THREE.Vector3(-1.4, 1.5, 3),
    new THREE.Vector3(1.2, 2.05, -9),
    new THREE.Vector3(0, 2.5, -18),
    new THREE.Vector3(6.4, 3.2, -28),
  ], false, 'catmullrom', 0.3);

  const hemi = new THREE.HemisphereLight(0x7eabdb, 0x071018, 1.15);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xdce9f3, 2.2);
  moonLight.position.set(16, 28, 8);
  moonLight.castShadow = profile.shadows;
  scene.add(moonLight);

  const sea = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(140, 140, 1, 1)),
    material(new THREE.MeshPhysicalMaterial({
      color: 0x09233b,
      roughness: profile.reflections ? 0.18 : 0.48,
      metalness: 0.25,
      transmission: 0.08,
      transparent: true,
      opacity: 0.96,
    })),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.08;
  scene.add(sea);

  const platform = new THREE.Mesh(
    geometry(new THREE.CylinderGeometry(7.4, 8, 0.7, 64)),
    material(new THREE.MeshStandardMaterial({ color: 0x2d1b1a, roughness: 0.66, metalness: 0.08 })),
  );
  platform.position.set(0, 0.25, -16);
  platform.receiveShadow = true;
  scene.add(platform);

  const moon = new THREE.Mesh(
    geometry(new THREE.SphereGeometry(8, 32, 24)),
    material(new THREE.MeshBasicMaterial({ color: 0xdce9f3, fog: false })),
  );
  moon.position.set(18, 24, -55);
  scene.add(moon);

  addGate(scene);
  addLanternPath(scene);
  addCity(scene);
  const particles = addParticles(scene, profile.particleCount);
  const dragon = new DragonController(scene, profile);

  return {
    scene,
    camera,
    update(frame, elapsed, delta) {
      const position = path.getPointAt(frame.cameraT);
      camera.position.copy(position);
      const targetT = Math.min(1, frame.cameraT + 0.035);
      const target = path.getPointAt(targetT);
      target.y += frame.phase === 'approach' ? 1.4 : 0.45;
      camera.lookAt(target);
      camera.fov = frame.phase === 'gate' ? 44 : 48;
      camera.updateProjectionMatrix();
      if (scene.fog instanceof THREE.FogExp2) scene.fog.density = frame.fogDensity;
      hemi.intensity = frame.worldLight * 1.25;
      moonLight.intensity = frame.worldLight * 2.3;
      particles.rotation.y = elapsed * 0.008;
      particles.position.y = Math.sin(elapsed * 0.18) * 0.16;
      sea.position.y = -0.08 + Math.sin(elapsed * 0.42) * 0.012;
      dragon.update(delta, frame);
    },
    dispose() {
      dragon.dispose();
      disposableGeometries.splice(0).forEach((item) => item.dispose());
      disposableMaterials.splice(0).forEach((item) => item.dispose());
    },
  };
}
