import * as THREE from 'three';
import { Kit, NOISE_GLSL, PALETTE } from './kit';
import { MOON_DIR } from './sky';

export const MAX_WATER_LIGHTS = 32;

export interface WaterRig {
  mesh: THREE.Mesh;
  update(elapsed: number): void;
}

/**
 * A mirror-dark sea. Instead of a costly planar reflection it shades analytically:
 * sky gradient + a moon glitter path + stretched reflections of every lantern.
 */
export function createWater(kit: Kit, scene: THREE.Scene, lights: THREE.Vector3[], detailed: boolean): WaterRig {
  const lightArray = Array.from({ length: MAX_WATER_LIGHTS }, (_, i) => lights[i]?.clone() ?? new THREE.Vector3(0, -999, 0));
  const material = kit.keep(new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color(0x020811) },
        uSky: { value: PALETTE.sky },
        uHorizon: { value: PALETTE.horizon },
        uSilver: { value: PALETTE.silver },
        uAmber: { value: PALETTE.amber },
        uMoon: { value: MOON_DIR },
        uLights: { value: lightArray },
        uLightCount: { value: Math.min(lights.length, MAX_WATER_LIGHTS) },
        uDetail: { value: detailed ? 1 : 0 },
      },
    ]),
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uDetail;
      uniform vec3 uDeep, uSky, uHorizon, uSilver, uAmber, uMoon;
      uniform vec3 uLights[${MAX_WATER_LIGHTS}];
      uniform int uLightCount;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      ${NOISE_GLSL}
      float height(vec2 p) {
        float t = uTime;
        float h = fbm(p * .35 + vec2(t * .05, t * .03)) * .6;
        h += fbm(p * 1.3 - vec2(t * .09, -t * .06)) * .3 * uDetail;
        return h;
      }
      void main() {
        vec2 p = vWorld.xz;
        float e = .08;
        float h0 = height(p);
        vec3 n = normalize(vec3(height(p - vec2(e, 0.)) - h0, e * 2.4, height(p - vec2(0., e)) - h0));
        n = normalize(mix(vec3(0., 1., 0.), n, .55));
        vec3 view = normalize(vWorld - cameraPosition);
        vec3 r = reflect(view, n);
        float fres = .04 + .96 * pow(1. - max(dot(-view, vec3(0., 1., 0.)), 0.), 5.);
        vec3 skyCol = mix(uHorizon * .9, uSky, smoothstep(0., .3, r.y));
        float m = max(dot(r, uMoon), 0.);
        vec3 col = mix(uDeep, skyCol, clamp(fres * 1.2, 0., 1.));
        col += uSilver * (pow(m, 280.) * 3.2 + pow(m, 40.) * .16) ;
        // lantern reflections, smeared vertically by the waves
        vec3 warm = vec3(0.);
        for (int i = 0; i < ${MAX_WATER_LIGHTS}; i++) {
          if (i >= uLightCount) break;
          vec3 l = uLights[i];
          vec3 toL = l - vWorld;
          float dist = length(toL);
          float a = max(dot(normalize(toL), r), 0.);
          warm += uAmber * pow(a, 900.) * 6. / (1. + dist * .02);
          warm += uAmber * pow(a, 60.) * .1 / (1. + dist * .08);
        }
        col += warm;
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #ifdef FOG_EXP2
          // the sea keeps its reflections further into the haze than solid objects
          float fogFactor = 1. - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth * .3);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
        #endif
      }`,
  }));
  const mesh = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(520, 520, 1, 1)), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.05;
  mesh.name = 'moon-sea';
  scene.add(mesh);
  return {
    mesh,
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
    },
  };
}
