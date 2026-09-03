import { defineConfig } from 'vitest/config';

/**
 * The root runner aggregates each package's own Vitest config rather than
 * carrying a glob of its own, so `npm test` here and `npm test` inside a
 * package run the same tests the same way. A package with no config is simply
 * not a project.
 */
export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
});
