import { WorldRuntime } from '../../lib/world/WorldRuntime';
import { sampleWorldFrame } from '../../lib/world/timeline';

export function mountWorld(root: HTMLElement): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>('#world-canvas');
  const poster = root.querySelector<HTMLElement>('[data-world-poster]');
  const fallback = root.querySelector<HTMLElement>('[data-fallback-destinations]');
  const companion = root.querySelector<HTMLElement>('[data-dragon-companion]');
  if (!canvas || !poster || !fallback || !companion) return () => undefined;

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
    const progress = window.scrollY / scrollRange;
    runtime?.setProgress(progress);
    companion.dataset.dragonMode = sampleWorldFrame(progress, false).dragonMode;
  };
  syncProgress();
  window.addEventListener('scroll', syncProgress, { passive: true });

  return () => {
    window.removeEventListener('scroll', syncProgress);
    runtime?.dispose();
  };
}
