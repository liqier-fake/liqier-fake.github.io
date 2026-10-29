export interface ImageMetaInput {
  src?: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
}

export interface ImageMeta {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  aspectRatio: number;
  orientation: 'landscape' | 'portrait' | 'square';
  srcset: string;
}

export function normalizeImageMeta(input: ImageMetaInput): ImageMeta {
  const src = input.src?.trim() || '/images/world-poster.webp';
  const rawWidth = Number.isFinite(input.width) && (input.width ?? 0) > 0 ? input.width! : 1600;
  const rawHeight = Number.isFinite(input.height) && (input.height ?? 0) > 0 ? input.height! : 1000;
  const scale = Math.min(1, 4096 / Math.max(rawWidth, rawHeight));
  const width = Math.max(1, Math.round(rawWidth * scale));
  const height = Math.max(1, Math.round(rawHeight * scale));
  const aspectRatio = width / height;
  const orientation = aspectRatio > 1.05 ? 'landscape' : aspectRatio < 0.95 ? 'portrait' : 'square';
  return {
    src,
    width,
    height,
    alt: input.alt?.trim() || '未提供图像说明',
    caption: input.caption?.trim() || '一帧尚未命名的光。',
    aspectRatio,
    orientation,
    srcset: `${src} 768w, ${src} 1600w`,
  };
}
