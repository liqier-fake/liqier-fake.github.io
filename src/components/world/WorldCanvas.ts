import { WorldRuntime } from '../../lib/world/WorldRuntime';

export function mountWorld(root: HTMLElement): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>('#world-canvas');
  const poster = root.querySelector<HTMLElement>('[data-world-poster]');
  const fallback = root.querySelector<HTMLElement>('[data-fallback-destinations]');
  if (!canvas || !poster || !fallback) return () => undefined;

  const showFallback = (state: 'fallback' | 'lost'): void => {
    root.dataset.worldState = state;
    poster.hidden = false;
    fallback.hidden = false;
    canvas.hidden = true;
  };

  let runtime: WorldRuntime | undefined;
  try {
    runtime = WorldRuntime.mount(canvas, {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      onContextLost: () => showFallback('lost'),
    });
    root.dataset.worldState = 'ready';
    canvas.hidden = false;
  } catch {
    showFallback('fallback');
  }

  const syncProgress = (): void => {
    const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    runtime?.setProgress(window.scrollY / scrollRange);
  };
  syncProgress();
  window.addEventListener('scroll', syncProgress, { passive: true });

  return () => {
    window.removeEventListener('scroll', syncProgress);
    runtime?.dispose();
  };
}
