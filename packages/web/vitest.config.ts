import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

/**
 * The web package's own runner, picked up by the root config's
 * `projects: ['packages/*']`. It carries the `vue()` plugin because a test
 * that imports a `.vue` file needs the SFC compiled, and `happy-dom` because
 * mounting a component needs a DOM — chosen over `jsdom` for startup speed.
 *
 * `tailwindcss()` is deliberately absent: the tests assert rendered structure,
 * never computed styles, so the stylesheet would cost time and buy nothing.
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    name: 'web',
    include: ['tests/**/*.test.ts'],
    environment: 'happy-dom',
  },
});
