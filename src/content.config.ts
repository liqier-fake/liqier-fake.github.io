import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { articleSchema, collectionSchema, photographySchema, thoughtSchema } from './lib/content/schema';

const contentBase = './src/content';

export const collections = {
  thoughts: defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: `${contentBase}/thoughts` }), schema: thoughtSchema }),
  articles: defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: `${contentBase}/articles` }), schema: articleSchema }),
  photography: defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: `${contentBase}/photography` }), schema: photographySchema }),
  collection: defineCollection({ loader: glob({ pattern: '**/*.{md,mdx}', base: `${contentBase}/collection` }), schema: collectionSchema }),
};
