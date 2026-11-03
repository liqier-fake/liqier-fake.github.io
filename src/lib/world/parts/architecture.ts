import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit, PALETTE, seeded } from './kit';
import type { GlowSpec } from './glow';

export interface Architecture {
  /** Flame positions: fed to the water shader and the glow sprites. */
  lanternLights: THREE.Vector3[];
  glows: GlowSpec[];
  /** Animated bits (paper slips, corridor glass, mirror ripples). */
  update(elapsed: number): void;
}

function plankTexture(kit: Kit, radial: boolean): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rnd = seeded(radial ? 5 : 9);
  if (ctx) {
    ctx.fillStyle = '#2a1916';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i += 1) {
      const shade = 30 + Math.floor(rnd() * 22);
      ctx.fillStyle = `rgb(${shade + 10},${shade - 6},${shade - 10})`;
      if (radial) {
        ctx.beginPath();
        ctx.moveTo(128, 128);
        ctx.arc(128, 128, 182, (i / 16) * Math.PI * 2, ((i + 0.94) / 16) * Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(0, i * 16, 256, 15);
      }
    }
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 260; i += 1) {
      ctx.fillStyle = rnd() > 0.5 ? '#000' : '#5a3a30';
      ctx.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 18, 1);
    }
  }
  const texture = kit.keep(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function latticeTexture(kit: Kit): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 64, 7);
    ctx.fillRect(0, 57, 64, 7);
    ctx.fillRect(0, 0, 7, 64);
    ctx.fillRect(57, 0, 7, 64);
    ctx.fillRect(29, 0, 5, 64);
    ctx.fillRect(0, 29, 64, 5);
  }
  const texture = kit.keep(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function bend(geometry: THREE.BufferGeometry, lift: number, halfWidth: number): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position');
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) / halfWidth;
    pos.setY(i, pos.getY(i) + lift * x * x * x * x);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function addTorii(kit: Kit, scene: THREE.Scene, z: number): void {
  const vermilion = kit.keep(new THREE.MeshStandardMaterial({ color: PALETTE.vermilion, roughness: 0.58, emissive: 0x4a120b, emissiveIntensity: 0.7 }));
  const black = kit.keep(new THREE.MeshStandardMaterial({ color: 0x0d0a0c, roughness: 0.7 }));
  const gate = new THREE.Group();
  gate.name = 'vermilion-gate';
  for (const x of [-3.3, 3.3]) {
    const post = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(0.34, 0.44, 8.4, 24)), vermilion);
    post.position.set(x, 4.2, 0);
    const foot = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(0.52, 0.55, 0.9, 24)), black);
    foot.position.set(x, 0.45, 0);
    gate.add(post, foot);
  }
  const nuki = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(9.2, 0.42, 0.34)), vermilion);
  nuki.position.y = 6.25;
  const tablet = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(0.62, 1.05, 0.22)), black);
  tablet.position.y = 6.98;
  const kasagi = new THREE.Mesh(kit.keep(bend(new THREE.BoxGeometry(12.4, 0.52, 0.82, 48, 1, 1), 0.62, 6.2)), vermilion);
  kasagi.position.y = 7.62;
  const shimaki = new THREE.Mesh(kit.keep(bend(new THREE.BoxGeometry(13.2, 0.34, 0.95, 48, 1, 1), 0.78, 6.6)), black);
  shimaki.position.y = 8.04;
  gate.add(nuki, tablet, kasagi, shimaki);
  gate.position.set(0, 0.55, z);
  gate.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  scene.add(gate);
}

function addPlatform(kit: Kit, scene: THREE.Scene, z: number): (t: number) => void {
  const deckTexture = plankTexture(kit, true);
  const deck = new THREE.Mesh(
    kit.keep(new THREE.CylinderGeometry(7.6, 8.1, 0.7, 64)),
    [
      kit.keep(new THREE.MeshStandardMaterial({ color: 0x241512, roughness: 0.8 })),
      kit.keep(new THREE.MeshStandardMaterial({ map: deckTexture, color: 0x6e5c56, roughness: 0.7, metalness: 0.05 })),
      kit.keep(new THREE.MeshStandardMaterial({ color: 0x120a09 })),
    ],
  );
  deck.position.set(0, 0.2, z);
  deck.receiveShadow = true;
  scene.add(deck);

  const rail = kit.keep(new THREE.MeshStandardMaterial({ color: PALETTE.vermilion, roughness: 0.6, emissive: 0x3a0d08, emissiveIntensity: 0.6 }));
  const ring = new THREE.Mesh(kit.keep(new THREE.TorusGeometry(7.45, 0.06, 6, 96)), rail);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 1.25, z);
  scene.add(ring);
  const postGeometry = kit.keep(new THREE.BoxGeometry(0.14, 0.75, 0.14));
  const posts = new THREE.InstancedMesh(postGeometry, rail, 40);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 40; i += 1) {
    const a = (i / 40) * Math.PI * 2;
    // leave openings where the pier meets the platform
    const s = Math.abs(Math.sin(a)) < 0.2 ? 0.001 : 1;
    m.compose(new THREE.Vector3(Math.cos(a) * 7.45, 0.92, z + Math.sin(a) * 7.45), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    posts.setMatrixAt(i, m);
  }
  scene.add(posts);

  // The central water mirror: a ring of slow silver ripples set into the deck.
  const mirrorMaterial = kit.keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSilver: { value: PALETTE.silver } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uSilver; varying vec2 vUv;
      void main(){
        float r = length(vUv);
        float rings = pow(.5 + .5 * sin(r * 26. - uTime * 1.4), 8.) * (1. - r);
        float body = smoothstep(1., .2, r) * .22;
        float edge = smoothstep(.04, 0., abs(r - .96)) * .9;
        float a = (rings * .5 + body + edge) * smoothstep(1., .97, r);
        gl_FragColor = vec4(uSilver * a, a);
      }`,
  }));
  const mirror = new THREE.Mesh(kit.keep(new THREE.CircleGeometry(2.3, 64)), mirrorMaterial);
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(0, 0.57, z + 2.6);
  scene.add(mirror);
  return (t) => { mirrorMaterial.uniforms.uTime.value = t; };
}

function addPiers(kit: Kit, scene: THREE.Scene): void {
  const texture = plankTexture(kit, false);
  const make = (length: number, z: number) => {
    const t = texture.clone();
    kit.keep(t);
    t.repeat.set(1, length / 4);
    t.needsUpdate = true;
    const pier = new THREE.Mesh(
      kit.keep(new THREE.BoxGeometry(3.2, 0.22, length)),
      kit.keep(new THREE.MeshStandardMaterial({ map: t, color: 0x6a5852, roughness: 0.78 })),
    );
    pier.position.set(0, 0.12, z);
    pier.receiveShadow = true;
    scene.add(pier);
  };
  make(26, 4);
  make(30, -38);
}

function addLanterns(kit: Kit, scene: THREE.Scene, spots: THREE.Vector3[]): THREE.Vector3[] {
  const parts = [
    new THREE.BoxGeometry(0.78, 0.26, 0.78).translate(0, 0.13, 0),
    new THREE.CylinderGeometry(0.12, 0.15, 1.05, 8).translate(0, 0.78, 0),
    new THREE.BoxGeometry(0.66, 0.12, 0.66).translate(0, 1.34, 0),
    new THREE.ConeGeometry(0.62, 0.44, 4).rotateY(Math.PI / 4).translate(0, 2.02, 0),
    new THREE.SphereGeometry(0.08, 8, 6).translate(0, 2.3, 0),
  ];
  const stoneGeometry = kit.keep(mergeGeometries(parts.map((g) => g.toNonIndexed())));
  parts.forEach((g) => g.dispose());
  const stone = kit.keep(new THREE.MeshStandardMaterial({ color: 0x6c727b, roughness: 0.92 }));
  const fireGeometry = kit.keep(new THREE.BoxGeometry(0.42, 0.42, 0.42).translate(0, 1.61, 0));
  const fire = kit.keep(new THREE.MeshStandardMaterial({ color: 0x2a1608, emissive: PALETTE.amber, emissiveMap: latticeTexture(kit), emissiveIntensity: 1.9 }));
  const stones = new THREE.InstancedMesh(stoneGeometry, stone, spots.length);
  const fires = new THREE.InstancedMesh(fireGeometry, fire, spots.length);
  const m = new THREE.Matrix4();
  const flames: THREE.Vector3[] = [];
  spots.forEach((spot, i) => {
    m.makeTranslation(spot.x, spot.y, spot.z);
    stones.setMatrixAt(i, m);
    fires.setMatrixAt(i, m);
    flames.push(new THREE.Vector3(spot.x, spot.y + 1.61, spot.z));
  });
  stones.castShadow = true;
  scene.add(stones, fires);
  return flames;
}

function addPavilion(kit: Kit, scene: THREE.Scene, at: THREE.Vector3, scale: number, rotation: number): THREE.Vector3 {
  const group = new THREE.Group();
  const wood = kit.keep(new THREE.MeshStandardMaterial({ color: 0x2a1714, roughness: 0.75 }));
  const vermilion = kit.keep(new THREE.MeshStandardMaterial({ color: PALETTE.vermilion, roughness: 0.6, emissive: 0x3a0d08, emissiveIntensity: 0.6 }));
  const tile = kit.keep(new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.5, metalness: 0.2 }));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#ffcf8a');
    g.addColorStop(1, '#e98a3f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(40,18,10,.85)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 128; i += 21) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
    }
  }
  const shojiTexture = kit.keep(new THREE.CanvasTexture(canvas));
  shojiTexture.colorSpace = THREE.SRGBColorSpace;
  const shoji = kit.keep(new THREE.MeshStandardMaterial({ map: shojiTexture, emissiveMap: shojiTexture, emissive: 0xffffff, emissiveIntensity: 0.75, side: THREE.DoubleSide }));

  const base = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(6, 0.45, 5)), wood);
  base.position.y = 1.0;
  group.add(base);
  for (const [x, z] of [[-2.7, -2.2], [2.7, -2.2], [-2.7, 2.2], [2.7, 2.2]]) {
    const stilt = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(0.3, 1.0, 0.3)), wood);
    stilt.position.set(x, 0.4, z);
    const post = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(0.14, 0.16, 2.7, 10)), vermilion);
    post.position.set(x, 2.55, z);
    group.add(stilt, post);
  }
  const wallGeometry = kit.keep(new THREE.PlaneGeometry(5.1, 2.3));
  for (const [x, z, ry, w] of [[0, -2.15, 0, 1], [0, 2.15, 0, 1], [-2.6, 0, Math.PI / 2, 0.8], [2.6, 0, Math.PI / 2, 0.8]] as const) {
    const wall = new THREE.Mesh(wallGeometry, shoji);
    wall.position.set(x, 2.45, z);
    wall.rotation.y = ry;
    wall.scale.x = w;
    group.add(wall);
  }
  const lintel = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(6.2, 0.28, 5.2)), wood);
  lintel.position.y = 3.86;
  const roof = new THREE.Mesh(kit.keep(new THREE.ConeGeometry(5.1, 1.9, 4, 1, true).rotateY(Math.PI / 4)), tile);
  roof.scale.set(1.12, 1, 0.92);
  roof.position.y = 4.95;
  const upper = new THREE.Mesh(kit.keep(new THREE.ConeGeometry(2.1, 1.1, 4).rotateY(Math.PI / 4)), tile);
  upper.position.y = 6.15;
  const finial = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(0.05, 0.1, 0.9, 6)), vermilion);
  finial.position.y = 6.95;
  group.add(lintel, roof, upper, finial);
  group.position.copy(at);
  group.rotation.y = rotation;
  group.scale.setScalar(scale);
  group.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  scene.add(group);
  return new THREE.Vector3(at.x, at.y + 2.4 * scale, at.z);
}

function addCorridor(kit: Kit, scene: THREE.Scene): (t: number) => void {
  const material = kit.keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSilver: { value: PALETTE.silver }, uViolet: { value: PALETTE.violet } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uSilver, uViolet; varying vec2 vUv;
      void main(){
        vec2 q = abs(vUv - .5) * 2.;
        float edge = smoothstep(.93, 1., max(q.x, q.y));
        float scan = .5 + .5 * sin(vUv.y * 140. + uTime * 2.);
        float sweep = smoothstep(.1, 0., abs(fract(vUv.y * .5 - uTime * .08) - .5) - .35);
        vec3 col = mix(uViolet, uSilver, vUv.y) * (.08 + scan * .03 + sweep * .06) + uSilver * edge * .7;
        float a = .16 + edge * .7;
        gl_FragColor = vec4(col, a);
      }`,
  }));
  const geometry = kit.keep(new THREE.PlaneGeometry(2.3, 3.1));
  for (let i = 0; i < 6; i += 1) {
    const pane = new THREE.Mesh(geometry, material);
    pane.position.set(-9.2 - (i % 2) * 1.6, 2.8 + Math.sin(i) * 0.25, -23 - i * 3.1);
    pane.rotation.y = 0.9;
    scene.add(pane);
  }
  return (t) => { material.uniforms.uTime.value = t; };
}

function addPaperSlips(kit: Kit, scene: THREE.Scene, rnd: () => number): { glows: GlowSpec[]; update(t: number): void } {
  const material = kit.keep(new THREE.MeshStandardMaterial({ color: 0xfff1da, emissive: 0xffd9a0, emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  const geometry = kit.keep(new THREE.PlaneGeometry(0.22, 0.6));
  const slips: Array<{ mesh: THREE.Mesh; y: number; phase: number }> = [];
  const glows: GlowSpec[] = [];
  const centres = [[3.8, -26], [-7, -3], [7.5, -6]];
  centres.forEach(([cx, cz], c) => {
    for (let i = 0; i < (c === 0 ? 9 : 4); i += 1) {
      const mesh = new THREE.Mesh(geometry, material);
      const y = 0.6 + rnd() * 1.1;
      mesh.position.set(cx + (rnd() - 0.5) * 4, y, cz + (rnd() - 0.5) * 4);
      mesh.rotation.set((rnd() - 0.5) * 0.4, rnd() * Math.PI, (rnd() - 0.5) * 0.5);
      scene.add(mesh);
      slips.push({ mesh, y, phase: rnd() * Math.PI * 2 });
      glows.push({ position: mesh.position.clone(), color: new THREE.Color(0xffd9a0), size: 0.8, flicker: rnd() });
    }
  });
  return {
    glows,
    update(t) {
      slips.forEach((slip) => {
        slip.mesh.position.y = slip.y + Math.sin(t * 0.6 + slip.phase) * 0.16;
        slip.mesh.rotation.y += 0.0015;
      });
    },
  };
}

export function createArchitecture(kit: Kit, scene: THREE.Scene): Architecture {
  const rnd = seeded(41);
  addTorii(kit, scene, -16);
  const mirror = addPlatform(kit, scene, -16);
  addPiers(kit, scene);

  const spots: THREE.Vector3[] = [];
  for (let z = 9; z >= -7; z -= 3.2) spots.push(new THREE.Vector3(-2.5, 0.23, z), new THREE.Vector3(2.5, 0.23, z));
  for (let z = -26; z >= -52; z -= 3.7) spots.push(new THREE.Vector3(-2.5, 0.23, z), new THREE.Vector3(2.5, 0.23, z));
  spots.push(new THREE.Vector3(-4.6, 0.55, -10.6), new THREE.Vector3(4.6, 0.55, -10.6));
  const flames = addLanterns(kit, scene, spots);

  const pavilionA = addPavilion(kit, scene, new THREE.Vector3(10.5, 0, -32), 1, -0.5);
  const pavilionB = addPavilion(kit, scene, new THREE.Vector3(15, 0, -47), 0.75, -0.2);
  const corridor = addCorridor(kit, scene);
  const slips = addPaperSlips(kit, scene, rnd);

  const amber = PALETTE.amber;
  const glows: GlowSpec[] = [
    ...flames.map((p, i) => ({ position: p, color: amber.clone(), size: 1.3, flicker: i * 0.37 })),
    { position: pavilionA, color: new THREE.Color(0xc77a3c), size: 6 },
    { position: pavilionB, color: new THREE.Color(0xc77a3c), size: 4.5 },
    { position: new THREE.Vector3(0, 0.9, -13.4), color: new THREE.Color(0x6f86a0), size: 5 },
    ...slips.glows,
  ];

  return {
    lanternLights: [...flames, pavilionA, pavilionB],
    glows,
    update(t) {
      mirror(t);
      corridor(t);
      slips.update(t);
    },
  };
}
