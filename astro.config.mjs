import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: process.env.PUBLIC_SITE_URL ?? 'https://example.github.io',
  base: process.env.PUBLIC_BASE_PATH ?? '/',
});
