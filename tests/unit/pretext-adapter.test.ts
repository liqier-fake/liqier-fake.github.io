import { describe, expect, it, vi } from 'vitest';
import { animateTextLayout, type TextAnimationTarget } from '../../src/lib/typography/pretext';

function target(text = '长夜之后'): TextAnimationTarget {
  return {
    textContent: text,
    dataset: {},
    animate: vi.fn(() => ({ cancel: vi.fn(), finish: vi.fn(), finished: Promise.resolve() })),
  };
}

describe('Pretext adapter', () => {
  it('settles kinetic text back into stable layout', async () => {
    const element = target();
    const handle = animateTextLayout(element, 'lunar-arc', { duration: 20, reducedMotion: false });
    await handle.settle();
    expect(element.textContent).toBe('长夜之后');
    expect(element.dataset.textState).toBe('settled');
  });

  it('skips transformation for reduced motion', async () => {
    const element = target('第一束光');
    const handle = animateTextLayout(element, 'ripple', { reducedMotion: true });
    await handle.settle();
    expect(element.animate).not.toHaveBeenCalled();
    expect(element.dataset.textState).toBe('settled');
  });

  it('can dispose without changing the original text', () => {
    const element = target();
    const handle = animateTextLayout(element, 'lunar-arc');
    handle.dispose();
    expect(element.textContent).toBe('长夜之后');
    expect(element.dataset.textState).toBe('settled');
  });
});
