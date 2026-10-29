import { z } from 'astro/zod';

export const sceneSchema = z.enum([
  'paper-slip',
  'essay-pavilion',
  'image-corridor',
  'moon-tree',
  'central-platform',
]);

const baseSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  date: z.coerce.date(),
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
  scene: sceneSchema,
  cover: z.string().optional(),
  draft: z.boolean().default(false),
});

export const thoughtSchema = baseSchema.extend({ scene: z.literal('paper-slip') });
export const articleSchema = baseSchema.extend({ scene: z.literal('essay-pavilion') });
export const photographySchema = baseSchema.extend({
  scene: z.literal('image-corridor'),
  image: z.string().min(1),
  camera: z.string().optional(),
  location: z.string().optional(),
  alt: z.string().default(''),
});
export const collectionSchema = baseSchema.extend({
  scene: z.literal('moon-tree'),
  image: z.string().min(1),
  sourceUrl: z.url(),
  creator: z.string().min(1),
  rightsNote: z.string().min(1),
  annotation: z.string().optional(),
});
