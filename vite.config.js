import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    root: '.',
    publicDir: 'public',
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.js$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
      commonjsOptions: {
        include: [/src\//, /node_modules\//],
        transformMixedEsModules: true,
      },
    },
    define: {
      'process.env.VITE_TIMEZONE': JSON.stringify(env.VITE_TIMEZONE || 'Europe/Helsinki'),
    },
    server: {
      port: parseInt(env.PORT) || 3031,
      proxy: {
        '/api': {
          target: `${env.DEV_FRONTEND_PROXY || 'http://localhost'}:${env.BACKEND_PORT || 3030}`,
          changeOrigin: true,
        },
      },
    },
  }
})
