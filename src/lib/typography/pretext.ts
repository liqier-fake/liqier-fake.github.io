export type TextLayoutPreset = 'lunar-arc' | 'ripple';

interface AnimationLike {
  finished: Promise<unknown>;
  cancel(): void;
  finish(): void;
}

export interface TextAnimationTarget {
  textContent: string | null;
  dataset: DOMStringMap | Record<string, string | undefined>;
  animate(keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: number | KeyframeAnimationOptions): AnimationLike;
}

export interface TextAnimationOptions {
  duration?: number;
  reducedMotion?: boolean;
}

export interface TextAnimationHandle {
  settle(): Promise<void>;
  dispose(): void;
}

const frames: Record<TextLayoutPreset, Keyframe[]> = {
  'lunar-arc': [
    { opacity: 0, transform: 'translate3d(-1.5rem, 2.5rem, 0) rotate(-3deg)', filter: 'blur(12px)', letterSpacing: '.18em' },
    { opacity: 0.82, offset: 0.62, transform: 'translate3d(.35rem, -.35rem, 0) rotate(.6deg)', filter: 'blur(1px)' },
    { opacity: 1, transform: 'none', filter: 'none', letterSpacing: '-.035em' },
  ],
  ripple: [
    { opacity: 0, transform: 'translateY(1.2rem) scaleY(.82)', filter: 'blur(8px)' },
    { opacity: 1, transform: 'none', filter: 'none' },
  ],
};

export function animateTextLayout(
  element: TextAnimationTarget,
  preset: TextLayoutPreset,
  options: TextAnimationOptions = {},
): TextAnimationHandle {
  const originalText = element.textContent;
  let animation: AnimationLike | undefined;
  let settled = false;

  const finish = (): void => {
    if (settled) return;
    settled = true;
    element.textContent = originalText;
    element.dataset.textState = 'settled';
  };

  if (options.reducedMotion) {
    finish();
  } else {
    element.dataset.textState = 'animating';
    animation = element.animate(frames[preset], {
      duration: options.duration ?? 900,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      fill: 'both',
    });
  }

  return {
    async settle() {
      if (animation) {
        try { await animation.finished; } catch { /* cancellation restores stable text */ }
      }
      finish();
    },
    dispose() {
      animation?.cancel();
      finish();
    },
  };
}

export function mountPretext(root: ParentNode = document): () => void {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const handles = Array.from(root.querySelectorAll<HTMLElement>('[data-pretext-title]')).map((element) => {
    const preset = (element.dataset.pretextTitle || 'lunar-arc') as TextLayoutPreset;
    const handle = animateTextLayout(element, preset, { reducedMotion });
    void handle.settle();
    return handle;
  });
  return () => handles.forEach((handle) => handle.dispose());
}
