import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.svelte.ts'],
    environment: 'node',
    // Los barridos reales de 112 municipios compiten por disco en Windows.
    maxWorkers: 1
  },
  resolve: {
    alias: {
      $lib: new URL('./src/lib', import.meta.url).pathname
    }
  }
});
