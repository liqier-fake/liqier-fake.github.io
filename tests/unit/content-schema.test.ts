import { describe, expect, it } from 'vitest';
import {
  articleSchema,
  collectionSchema,
  photographySchema,
  thoughtSchema,
} from '../../src/lib/content/schema';
import { destinationFor } from '../../src/lib/content/navigation';

const shared = {
  title: 'First light',
  slug: 'first-light',
  date: new Date('2026-10-29'),
  summary: 'A small note held in moonlight.',
  tags: ['night'],
  draft: false,
};

describe('content schemas', () => {
  it('accepts valid entries for every content kind', () => {
    expect(thoughtSchema.safeParse({ ...shared, scene: 'paper-slip' }).success).toBe(true);
    expect(articleSchema.safeParse({ ...shared, scene: 'essay-pavilion' }).success).toBe(true);
    expect(photographySchema.safeParse({ ...shared, scene: 'image-corridor', image: '/images/moon.webp' }).success).toBe(true);
    expect(collectionSchema.safeParse({
      ...shared,
      scene: 'moon-tree',
      image: '/images/generated-light.webp',
      sourceUrl: 'https://example.com/source',
      creator: 'OpenAI image generation',
      rightsNote: 'Original generated placeholder',
    }).success).toBe(true);
  });

  it.each(['sourceUrl', 'creator', 'rightsNote'] as const)(
    'rejects a collected image without %s',
    (field) => {
      const entry = {
        ...shared,
        scene: 'moon-tree',
        image: '/images/reference.webp',
        sourceUrl: 'https://example.com/source',
        creator: 'Example Creator',
        rightsNote: 'CC0',
      };
      delete entry[field];

      expect(collectionSchema.safeParse(entry).success).toBe(false);
    },
  );
});

it('maps an article to its pavilion destination', () => {
  expect(destinationFor('articles', 'after-the-long-night')).toEqual({
    id: 'essay-pavilion:after-the-long-night',
    kind: 'articles',
    scene: 'essay-pavilion',
    slug: 'after-the-long-night',
  });
});
