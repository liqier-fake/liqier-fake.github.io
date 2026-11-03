import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { isSoftwareRenderer, selectQualityProfile, type QualityProfile } from './quality';

function probeRendererName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}
import { createWorldScene, type WorldScene } from './scene';
import { sampleWorldFrame } from './timeline';

export interface WorldRuntimeOptions {
  reducedMotion: boolean;
  onContextLost(): void;
  /** Screen positions (CSS px) of the entrance anchors, reported every frame. */
  onAnchors?(anchors: Record<string, ScreenAnchor>): void;
}

export interface ScreenAnchor { x: number; y: number; visible: boolean; }

export interface WorldDiagnostics {
  renderCount: number;
  paused: boolean;
  pixelRatio: number;
  particleCount: number;
  tier: QualityProfile['tier'];
  cameraT: number;
  camera?: number[];
}

declare global {
  interface Window { __LIQIER_DIAGNOSTICS__?: WorldDiagnostics; }
}

export class WorldRuntime {
  readonly profile: QualityProfile;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly world: WorldScene;
  private readonly canvas: HTMLCanvasElement;
  private readonly options: WorldRuntimeOptions;
  private progress = 0;
  private frameId = 0;
  private visible = true;
  private readonly startedAt = performance.now();
  private previousTime = performance.now();
  private readonly diagnostics?: WorldDiagnostics;
  private readonly composer?: EffectComposer;
  private readonly bloom?: UnrealBloomPass;
  private readonly projected = new THREE.Vector3();
  private readonly anchorOut: Record<string, ScreenAnchor> = {};

  static mount(canvas: HTMLCanvasElement, options: WorldRuntimeOptions): WorldRuntime {
    return new WorldRuntime(canvas, options);
  }

  private constructor(canvas: HTMLCanvasElement, options: WorldRuntimeOptions) {
    this.canvas = canvas;
    this.options = options;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    this.profile = selectQualityProfile({
      width: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio || 1,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      dataSaver: connection?.saveData === true,
      softwareRenderer: isSoftwareRenderer(probeRendererName()),
    });
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.profile.tier === 'high', alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.profile.pixelRatio);
    this.renderer.shadowMap.enabled = this.profile.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.world = createWorldScene(this.profile, options.reducedMotion);
    if (this.profile.postprocessing) {
      this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
      this.composer.addPass(new RenderPass(this.world.scene, this.world.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.82);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    if (navigator.webdriver || new URLSearchParams(location.search).has('diagnostics')) {
      this.diagnostics = window.__LIQIER_DIAGNOSTICS__ = {
        renderCount: 0,
        paused: false,
        pixelRatio: this.profile.pixelRatio,
        particleCount: this.profile.particleCount,
        tier: this.profile.tier,
        cameraT: 0,
      };
    }
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.renderLoop();
  }

  setProgress(progress: number): void {
    this.progress = progress;
  }

  enterDestination(_id: string): void {
    this.progress = 0.84;
  }

  returnToHub(): void {
    this.progress = 0.58;
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointer);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.world.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = Math.max(1, window.innerHeight);
    this.renderer.setSize(width, height, false);
    this.world.resize(width, height);
    if (this.composer) {
      this.composer.setPixelRatio(this.profile.pixelRatio);
      this.composer.setSize(width, height);
      this.bloom?.resolution.set(width / 2, height / 2);
    }
  };

  private readonly onPointer = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    this.world.setPointer(event.clientX / window.innerWidth * 2 - 1, event.clientY / window.innerHeight * 2 - 1);
  };

  private reportAnchors(): void {
    if (!this.options.onAnchors) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.world.anchors.forEach((point, id) => {
      this.projected.copy(point).project(this.world.camera);
      const visible = this.projected.z < 1 && Math.abs(this.projected.x) < 1.1 && Math.abs(this.projected.y) < 1.1;
      this.anchorOut[id] = { x: (this.projected.x + 1) / 2 * width, y: (1 - this.projected.y) / 2 * height, visible };
    });
    this.options.onAnchors(this.anchorOut);
  }

  private readonly onVisibilityChange = (): void => {
    this.visible = !document.hidden;
    if (this.diagnostics) this.diagnostics.paused = !this.visible;
    if (this.visible && this.frameId === 0) this.renderLoop();
  };

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.options.onContextLost();
  };

  private readonly renderLoop = (): void => {
    if (!this.visible) {
      this.frameId = 0;
      return;
    }
    const elapsed = (performance.now() - this.startedAt) / 1000;
    const now = performance.now();
    const delta = (now - this.previousTime) / 1000;
    this.previousTime = now;
    const frame = sampleWorldFrame(this.progress, this.options.reducedMotion);
    if (this.diagnostics) {
      this.diagnostics.renderCount += 1;
      this.diagnostics.cameraT = frame.cameraT;
    }
    this.world.update(frame, elapsed, delta);
    if (this.diagnostics) this.diagnostics.camera = this.world.camera.position.toArray().map((v) => Math.round(v * 100) / 100);
    if (this.composer) this.composer.render(delta);
    else this.renderer.render(this.world.scene, this.world.camera);
    this.reportAnchors();
    this.frameId = requestAnimationFrame(this.renderLoop);
  };
}
