import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: null,
      precompress: false,
      strict: true
    }),
    paths: {
      base: process.env.BASE_PATH ?? ''
    },
    prerender: {
      entries: ['/', '/como-lo-sabemos']
    },
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self', 'wasm-unsafe-eval'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': [
          'self',
          'data:',
          'blob:',
          'https://geo.bizkaia.eus',
          'https://www.geo.euskadi.eus',
          'https://opengis.bizkaia.eus'
        ],
        'connect-src': [
          'self',
          'https://geo.bizkaia.eus',
          'https://www.geo.euskadi.eus',
          'https://opengis.bizkaia.eus'
        ],
        'worker-src': ['self', 'blob:'],
        'font-src': ['self'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self']
      }
    }
  }
};

export default config;
