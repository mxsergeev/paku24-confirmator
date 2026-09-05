import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },
  test: {
    environment: 'node',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    globals: true,
    setupFiles: ['./test/setup.js'],
    fileParallelism: false,
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**', 'e2e/**'],
    sequence: {
      concurrent: false,
    },
  },
})
