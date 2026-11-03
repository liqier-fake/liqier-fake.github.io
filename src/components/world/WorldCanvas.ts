import type { WorldRuntime } from '../../lib/world/WorldRuntime';
import { sampleWorldFrame } from '../../lib/world/timeline';

export function mountWorld(root: HTMLElement): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>('#world-canvas');
  const poster = root.querySelector<HTMLElement>('[data-world-poster]');
  const fallback = root.querySelector<HTMLElement>('[data-fallback-destinations]');
  const companion = root.querySelector<HTMLElement>('[data-dragon-companion]');
  if (!canvas || !poster || !fallback || !companion) return () => undefined;

  const showFallback = (state: 'fallback' | 'lost'): void => {
    root.dataset.worldState = state;
    document.documentElement.dataset.world = state;
    poster.hidden = false;
    fallback.hidden = false;
    canvas.hidden = true;
  };

  let runtime: WorldRuntime | undefined;
  let disposed = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.dataset.motion = reducedMotion ? 'reduced' : 'full';
  root.dataset.worldState = 'loading';
  poster.hidden = false;

  const syncProgress = (): void => {
    const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = root.dataset.worldView === 'reading' ? 0.84 : window.scrollY / scrollRange;
    runtime?.setProgress(progress);
    companion.dataset.dragonMode = sampleWorldFrame(progress, false).dragonMode;
  };
  // Return to the remembered hub position. Instant (the page uses smooth scrolling), and re-applied once the
  // world is ready because WebGL start-up can swallow the first attempt — unless the visitor already scrolled.
  const saved = root.dataset.worldView !== 'reading' ? Number(sessionStorage.getItem('liqier:hub-scroll')) : 0;
  let userScrolled = false;
  const markUser = (): void => { userScrolled = true; };
  const restore = (): void => {
    if (!Number.isFinite(saved) || saved <= 0 || userScrolled || Math.abs(window.scrollY - saved) < 2) return;
    window.scrollTo({ top: saved, behavior: 'instant' });
    syncProgress();
  };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) => window.addEventListener(type, markUser, { once: true, passive: true }));
  const start = async (): Promise<void> => {
    try {
      const { WorldRuntime } = await import('../../lib/world/WorldRuntime');
      if (disposed) return;
      runtime = WorldRuntime.mount(canvas, {
        reducedMotion,
        onContextLost: () => showFallback('lost'),
        onAnchors: (anchors) => window.dispatchEvent(new CustomEvent('world:anchors', { detail: anchors })),
      });
      root.dataset.worldState = 'ready';
      document.documentElement.dataset.world = 'ready';
      poster.hidden = true;
      canvas.hidden = false;
      if (root.dataset.worldView === 'reading') runtime.enterDestination('reading-pavilion');
      requestAnimationFrame(restore);
      syncProgress();
    } catch {
      if (!disposed) showFallback('fallback');
    }
  };
  void start();
  syncProgress();
  requestAnimationFrame(restore);
  window.addEventListener('scroll', syncProgress, { passive: true });

  return () => {
    disposed = true;
    window.removeEventListener('scroll', syncProgress);
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) => window.removeEventListener(type, markUser));
    runtime?.dispose();
  };
}
