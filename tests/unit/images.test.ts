import { describe, expect, it } from 'vitest';
import { normalizeImageMeta } from '../../src/lib/content/images';

describe('image metadata normalization', () => {
  it('preserves landscape and portrait aspect ratios', () => {
    expect(normalizeImageMeta({ src: '/wide.webp', width: 1600, height: 900 }).aspectRatio).toBeCloseTo(16 / 9);
    expect(normalizeImageMeta({ src: '/tall.webp', width: 900, height: 1600 }).orientation).toBe('portrait');
  });

  it('caps oversized dimensions without distortion', () => {
    const image = normalizeImageMeta({ src: '/huge.webp', width: 12000, height: 6000 });
    expect(image.width).toBe(4096);
    expect(image.height).toBe(2048);
  });

  it('supplies resilient source and caption defaults', () => {
    const image = normalizeImageMeta({ src: '', width: 0, height: 0, alt: '' });
    expect(image.src).toBe('/images/world-poster.webp');
    expect(image.alt).toBe('未提供图像说明');
    expect(image.caption).toBe('一帧尚未命名的光。');
    expect(image.srcset).toContain('768w');
  });
});
