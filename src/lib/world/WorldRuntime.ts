import * as THREE from 'three';
import { selectQualityProfile, type QualityProfile } from './quality';
import { createWorldScene, type WorldScene } from './scene';
import { sampleWorldFrame } from './timeline';

export interface WorldRuntimeOptions {
  reducedMotion: boolean;
  onContextLost(): void;
}

export interface WorldDiagnostics {
  renderCount: number;
  paused: boolean;
  pixelRatio: number;
  particleCount: number;
  tier: QualityProfile['tier'];
  cameraT: number;
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
    });
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.profile.tier === 'high', alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.profile.pixelRatio);
    this.renderer.shadowMap.enabled = this.profile.shadows;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.world = createWorldScene(this.profile);
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
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.world.dispose();
    this.renderer.dispose();
  }

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = Math.max(1, window.innerHeight);
    this.renderer.setSize(width, height, false);
    this.world.camera.aspect = width / height;
    this.world.camera.updateProjectionMatrix();
  };

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
    this.renderer.render(this.world.scene, this.world.camera);
    this.frameId = requestAnimationFrame(this.renderLoop);
  };
}
