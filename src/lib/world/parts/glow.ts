import * as THREE from 'three';
import { Kit } from './kit';

export interface GlowSpec {
  position: THREE.Vector3;
  color: THREE.Color;
  /** World-space diameter of the halo. */
  size: number;
  /** Phase offset for flicker; omit for a steady light. */
  flicker?: number;
}

export interface GlowRig {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
}

/** One draw call of soft additive halos — lantern flames, beacons, slips of paper. */
export function createGlows(kit: Kit, scene: THREE.Scene, specs: GlowSpec[], name: string): GlowRig {
  const positions = new Float32Array(specs.length * 3);
  const colors = new Float32Array(specs.length * 3);
  const sizes = new Float32Array(specs.length);
  const flicker = new Float32Array(specs.length);
  specs.forEach((spec, i) => {
    positions.set([spec.position.x, spec.position.y, spec.position.z], i * 3);
    colors.set([spec.color.r, spec.color.g, spec.color.b], i * 3);
    sizes[i] = spec.size;
    flicker[i] = spec.flicker ?? -1;
  });
  const geometry = kit.keep(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aFlicker', new THREE.BufferAttribute(flicker, 1));
  const material = kit.keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: { uTime: { value: 0 }, uScale: { value: 400 }, uGain: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aFlicker;
      uniform float uTime, uScale;
      varying vec3 vColor;
      varying float vA;
      void main() {
        vColor = color;
        float f = aFlicker < 0. ? 1. : .82 + .18 * sin(uTime * 7.3 + aFlicker * 11.) * sin(uTime * 3.1 + aFlicker * 5.);
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        vA = f * exp(-max(-mv.z - 20., 0.) * .018);
        gl_PointSize = aSize * uScale / max(-mv.z, .1);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uGain;
      varying vec3 vColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.;
        float core = exp(-d * d * 18.) * .9;
        float halo = exp(-d * d * 3.2) * .38;
        float a = (core + halo) * (1. - smoothstep(.8, 1., d)) * vA * uGain;
        gl_FragColor = vec4(vColor * a, a);
      }`,
  }));
  const points = new THREE.Points(geometry, material);
  points.name = name;
  points.frustumCulled = false;
  scene.add(points);
  return { points, material };
}
