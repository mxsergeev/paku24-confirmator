import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
})
