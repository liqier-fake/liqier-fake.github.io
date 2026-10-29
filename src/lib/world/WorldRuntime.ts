import * as THREE from 'three';
import { selectQualityProfile, type QualityProfile } from './quality';
import { createWorldScene, type WorldScene } from './scene';
import { sampleWorldFrame } from './timeline';

export interface WorldRuntimeOptions {
  reducedMotion: boolean;
  onContextLost(): void;
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
    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.renderLoop();
  }

  setProgress(progress: number): void {
    this.progress = progress;
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
    this.world.update(frame, elapsed, delta);
    this.renderer.render(this.world.scene, this.world.camera);
    this.frameId = requestAnimationFrame(this.renderLoop);
  };
}
